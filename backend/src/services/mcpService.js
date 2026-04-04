import fs from "fs";
import path from "path";
import { readFiles } from "../controllers/fileController.js";

const MODEL_CACHE = new Map();
const SUPPORTED_EXTENSIONS = new Set([".js", ".jsx", ".ts", ".tsx", ".py"]);

function tokenize(text = "") {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function unique(arr) {
  return [...new Set(arr)];
}

function scoreOverlap(aTokens, bTokens) {
  if (!aTokens.length || !bTokens.length) return 0;
  const bSet = new Set(bTokens);
  let common = 0;
  for (const token of aTokens) {
    if (bSet.has(token)) common += 1;
  }
  return common / Math.sqrt(aTokens.length * bTokens.length);
}

function riskLevel(score) {
  if (score >= 70) return "HIGH";
  if (score >= 35) return "MED";
  return "LOW";
}

function impactLevel(score) {
  if (score >= 75) return "HIGH";
  if (score >= 40) return "MED";
  return "LOW";
}

function getRepoDir(repoName = "repo1", repoPath = null) {
  if (repoPath && fs.existsSync(repoPath) && fs.statSync(repoPath).isDirectory()) {
    return repoPath;
  }

  const preferred = `./repos/${repoName}`;
  if (fs.existsSync(preferred)) return preferred;
  if (fs.existsSync("./repos/repo1")) return "./repos/repo1";

  const workspaceRoot = path.resolve(process.cwd(), "..");
  if (fs.existsSync(workspaceRoot) && fs.statSync(workspaceRoot).isDirectory()) {
    return workspaceRoot;
  }

  return null;
}

function computeRepoStamp(repoDir, files) {
  let stamp = 0;
  for (const file of files) {
    const stats = fs.statSync(file);
    stamp += stats.mtimeMs;
  }
  return `${repoDir}:${files.length}:${Math.floor(stamp)}`;
}

function createNode({ id, type, label, relativePath, text, parentId = null }) {
  return {
    id,
    type,
    label,
    path: relativePath,
    parentId,
    text,
    tokens: tokenize(`${label} ${relativePath} ${text}`),
  };
}

export function simulateImpactWithMcp({
  repoName = "repo1",
  repoPath = null,
  nodeId = null,
  changeType = "modify",
  maxDepth = 3,
  limit = 10,
}) {
  const model = buildModel(repoName, repoPath);
  if (!model.repoDir) {
    return {
      meta: { repo: repoName, found: false },
      summary: "Repository was not found.",
      focus_node: null,
      impact: { score: 0, level: "LOW", change_type: changeType },
      blast_radius: { total_impacted_nodes: 0, high: 0, medium: 0, low: 0 },
      top_impacted_nodes: [],
      ui_hints: { highlight_node_ids: [], highlight_edge_ids: [], focus_camera_node_id: null },
    };
  }

  const localRiskMap = new Map(model.nodes.map((node) => [node.id, computeLocalRisk(node)]));
  const propagatedRiskMap = computePropagatedRisk(model, localRiskMap);

  let focus = nodeId ? model.nodeById.get(nodeId) : null;
  if (!focus) {
    focus = [...model.nodes].sort(
      (a, b) => (propagatedRiskMap.get(b.id) || 0) - (propagatedRiskMap.get(a.id) || 0)
    )[0] || null;
  }

  if (!focus) {
    return {
      meta: { repo: repoName, found: true, node_count: model.nodes.length, edge_count: model.edges.length },
      summary: "No nodes available for impact simulation.",
      focus_node: null,
      impact: { score: 0, level: "LOW", change_type: changeType },
      blast_radius: { total_impacted_nodes: 0, high: 0, medium: 0, low: 0 },
      top_impacted_nodes: [],
      ui_hints: { highlight_node_ids: [], highlight_edge_ids: [], focus_camera_node_id: null },
    };
  }

  const edgeWeight = {
    semantic_call: 0.84,
    import: 0.72,
    contains: 0.4,
  };

  const impactMap = new Map([[focus.id, 100]]);
  const distanceMap = new Map([[focus.id, 0]]);
  const edgeTrail = new Set();
  const queue = [{ id: focus.id, score: 100, depth: 0 }];

  while (queue.length) {
    const cur = queue.shift();
    if (cur.depth >= maxDepth || cur.score <= 8) continue;

    const neighbors = [
      ...(model.adjacencyOut.get(cur.id) || []).map((edge) => ({ edge, next: edge.target })),
      ...(model.adjacencyIn.get(cur.id) || []).map((edge) => ({ edge, next: edge.source })),
    ];

    for (const { edge, next } of neighbors) {
      const decay = edgeWeight[edge.type] || 0.55;
      const nextScore = cur.score * decay;
      const prev = impactMap.get(next) || 0;
      if (nextScore > prev) {
        impactMap.set(next, Math.min(100, nextScore));
        distanceMap.set(next, Math.min(distanceMap.get(next) ?? Number.MAX_SAFE_INTEGER, cur.depth + 1));
        edgeTrail.add(edge.id);
      }

      if ((distanceMap.get(next) ?? Number.MAX_SAFE_INTEGER) > cur.depth + 1 && cur.depth + 1 <= maxDepth) {
        queue.push({ id: next, score: nextScore, depth: cur.depth + 1 });
      }
    }
  }

  const impactedNodes = [...impactMap.entries()]
    .map(([id, score]) => ({
      node: model.nodeById.get(id),
      impact_score: Number(score.toFixed(2)),
      distance: distanceMap.get(id) || 0,
      propagated_risk: Number((propagatedRiskMap.get(id) || 0).toFixed(2)),
    }))
    .filter((x) => x.node)
    .sort((a, b) => b.impact_score - a.impact_score);

  const topImpacted = impactedNodes
    .filter((item) => item.node.id !== focus.id)
    .slice(0, limit)
    .map((item) => ({
      node_id: item.node.id,
      label: item.node.label,
      type: item.node.type,
      path: item.node.path,
      impact_score: item.impact_score,
      propagated_risk: item.propagated_risk,
      distance: item.distance,
      impact_level: impactLevel(item.impact_score),
    }));

  const bucket = { high: 0, medium: 0, low: 0 };
  for (const item of impactedNodes) {
    const lvl = impactLevel(item.impact_score);
    if (lvl === "HIGH") bucket.high += 1;
    else if (lvl === "MED") bucket.medium += 1;
    else bucket.low += 1;
  }

  const aggregateImpact = impactedNodes.slice(0, Math.max(5, limit));
  const aggregateScore = aggregateImpact.length
    ? aggregateImpact.reduce((acc, cur) => acc + cur.impact_score, 0) / aggregateImpact.length
    : 0;

  const focusRisk = propagatedRiskMap.get(focus.id) || 0;
  const impactScore = Number(Math.min(100, aggregateScore * 0.75 + focusRisk * 0.25).toFixed(2));

  return {
    meta: {
      repo: repoName,
      found: true,
      node_count: model.nodes.length,
      edge_count: model.edges.length,
      built_at: model.builtAt,
      cache_hit: model.cacheHit,
      phase: 1,
    },
    summary: `Impact simulation for ${focus.type} '${focus.label}' computed blast radius using cross-file dependencies.`,
    focus_node: {
      node_id: focus.id,
      label: focus.label,
      type: focus.type,
      path: focus.path,
    },
    impact: {
      score: impactScore,
      level: impactLevel(impactScore),
      change_type: changeType,
      max_depth: maxDepth,
      rationale: "Impact decays across dependency edges and is blended with propagated risk.",
    },
    blast_radius: {
      total_impacted_nodes: impactedNodes.length,
      high: bucket.high,
      medium: bucket.medium,
      low: bucket.low,
    },
    top_impacted_nodes: topImpacted,
    ui_hints: {
      highlight_node_ids: unique([focus.id, ...topImpacted.map((n) => n.node_id)]),
      highlight_edge_ids: [...edgeTrail].slice(0, 40),
      focus_camera_node_id: focus.id,
      severity_palette: {
        high: "#ef4444",
        medium: "#f59e0b",
        low: "#22c55e",
      },
    },
  };
}

function buildModel(repoName, repoPath = null) {
  const repoDir = getRepoDir(repoName, repoPath);
  if (!repoDir) {
    return {
      repoName,
      repoDir: null,
      nodes: [],
      edges: [],
      nodeById: new Map(),
      adjacencyOut: new Map(),
      adjacencyIn: new Map(),
      searchIndex: [],
      builtAt: Date.now(),
      cacheHit: false,
    };
  }

  const allFiles = readFiles(repoDir).filter((filePath) => SUPPORTED_EXTENSIONS.has(path.extname(filePath)));
  const stamp = computeRepoStamp(repoDir, allFiles);
  const cacheKey = `${repoName}:${stamp}`;

  if (MODEL_CACHE.has(cacheKey)) {
    return { ...MODEL_CACHE.get(cacheKey), cacheHit: true };
  }

  const nodes = [];
  const edges = [];
  const nodeById = new Map();
  const fileSet = new Set(allFiles.map((abs) => path.relative(repoDir, abs)));

  for (const filePath of allFiles) {
    const relativePath = path.relative(repoDir, filePath);
    const content = fs.readFileSync(filePath, "utf-8");
    const fileId = relativePath;

    const fileNode = createNode({
      id: fileId,
      type: "file",
      label: path.basename(filePath),
      relativePath,
      text: content.slice(0, 3500),
    });

    nodes.push(fileNode);
    nodeById.set(fileId, fileNode);

    const ext = path.extname(filePath).toLowerCase();
    const symbols = [];

    if ([".js", ".jsx", ".ts", ".tsx"].includes(ext)) {
      const importRegex = /(?:import\s+(?:.*)\s+from\s+['"](.+?)['"])|(?:require\(['"](.+?)['"]\))/g;
      let importMatch;
      while ((importMatch = importRegex.exec(content)) !== null) {
        const rawPath = importMatch[1] || importMatch[2];
        if (!rawPath || !(rawPath.startsWith(".") || rawPath.startsWith("/"))) continue;

        const currentDir = path.dirname(relativePath);
        let targetPath = path.normalize(path.join(currentDir, rawPath));
        if (targetPath.startsWith(`.${path.sep}`)) targetPath = targetPath.substring(2);

        const lookups = [
          targetPath,
          `${targetPath}.js`,
          `${targetPath}.jsx`,
          `${targetPath}.ts`,
          `${targetPath}.tsx`,
          path.join(targetPath, "index.js"),
          path.join(targetPath, "index.ts"),
        ];
        const found = lookups.find((p) => fileSet.has(p));
        if (found && found !== fileId) {
          edges.push({
            id: `import:${fileId}->${found}`,
            source: fileId,
            target: found,
            type: "import",
            confidence: "high",
          });
        }
      }

      const funcRegex = /(?:function\s+([a-zA-Z0-9_]+))|(?:const\s+([a-zA-Z0-9_]+)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[a-zA-Z0-9_]+)\s*=>)/g;
      let f;
      while ((f = funcRegex.exec(content)) !== null) {
        const fnName = f[1] || f[2];
        if (fnName) symbols.push({ name: fnName, type: "function" });
      }

      const classRegex = /class\s+([a-zA-Z0-9_]+)/g;
      let c;
      while ((c = classRegex.exec(content)) !== null) {
        if (c[1]) symbols.push({ name: c[1], type: "class" });
      }
    }

    if (ext === ".py") {
      const pyFunc = /def\s+([a-zA-Z_][a-zA-Z0-9_]*)/g;
      let pf;
      while ((pf = pyFunc.exec(content)) !== null) {
        if (pf[1]) symbols.push({ name: pf[1], type: "function" });
      }

      const pyClass = /class\s+([a-zA-Z_][a-zA-Z0-9_]*)/g;
      let pc;
      while ((pc = pyClass.exec(content)) !== null) {
        if (pc[1]) symbols.push({ name: pc[1], type: "class" });
      }
    }

    for (const sym of unique(symbols.map((s) => `${s.type}:${s.name}`))) {
      const [symType, symName] = sym.split(":");
      const symbolId = `${fileId}:${symType}:${symName}`;
      const symbolNode = createNode({
        id: symbolId,
        type: symType,
        label: symName,
        relativePath,
        text: `${symType} ${symName} in ${relativePath}`,
        parentId: fileId,
      });
      nodes.push(symbolNode);
      nodeById.set(symbolId, symbolNode);
      edges.push({
        id: `contains:${fileId}->${symbolId}`,
        source: fileId,
        target: symbolId,
        type: "contains",
        confidence: "high",
      });
    }
  }

  const symbolNodes = nodes.filter((n) => n.type === "function" || n.type === "class");
  for (const fileNode of nodes.filter((n) => n.type === "file")) {
    for (const target of symbolNodes) {
      if (target.parentId === fileNode.id) continue;
      const symbolCall = new RegExp(`\\b${target.label}\\s*\\(`);
      if (symbolCall.test(fileNode.text)) {
        edges.push({
          id: `semantic-call:${fileNode.id}->${target.id}`,
          source: fileNode.id,
          target: target.id,
          type: "semantic_call",
          confidence: "medium",
        });
      }
    }
  }

  const adjacencyOut = new Map();
  const adjacencyIn = new Map();
  for (const node of nodes) {
    adjacencyOut.set(node.id, []);
    adjacencyIn.set(node.id, []);
  }
  for (const edge of edges) {
    if (!adjacencyOut.has(edge.source) || !adjacencyIn.has(edge.target)) continue;
    adjacencyOut.get(edge.source).push(edge);
    adjacencyIn.get(edge.target).push(edge);
  }

  const model = {
    repoName,
    repoDir,
    nodes,
    edges,
    nodeById,
    adjacencyOut,
    adjacencyIn,
    searchIndex: nodes.map((node) => ({ nodeId: node.id, tokens: node.tokens })),
    builtAt: Date.now(),
    cacheHit: false,
  };

  for (const [key] of MODEL_CACHE) {
    if (key.startsWith(`${repoName}:`) && key !== cacheKey) MODEL_CACHE.delete(key);
  }
  MODEL_CACHE.set(cacheKey, model);
  return model;
}

function computeLocalRisk(node) {
  const text = `${node.label} ${node.path} ${node.text}`.toLowerCase();
  const checks = [
    { regex: /eval\(|exec\(|shell|child_process|subprocess/, weight: 35 },
    { regex: /password|secret|token|api[_-]?key/, weight: 18 },
    { regex: /delete\s+from|drop\s+table|truncate|raw query/, weight: 24 },
    { regex: /auth|login|jwt|session|cookie/, weight: 14 },
    { regex: /fs\.|writefile|unlink|rm\s+-rf/, weight: 17 },
    { regex: /http|axios|fetch|request/, weight: 10 },
  ];
  let score = 4;
  for (const check of checks) {
    if (check.regex.test(text)) score += check.weight;
  }
  return Math.min(100, score);
}

function computePropagatedRisk(model, localRiskMap) {
  const propagated = new Map();
  const decayByEdge = {
    import: 0.75,
    contains: 0.35,
    semantic_call: 0.8,
  };

  for (const node of model.nodes) {
    propagated.set(node.id, localRiskMap.get(node.id) || 0);
  }

  const seeds = model.nodes
    .map((n) => ({ id: n.id, risk: localRiskMap.get(n.id) || 0 }))
    .filter((x) => x.risk >= 60)
    .sort((a, b) => b.risk - a.risk);

  for (const seed of seeds) {
    const queue = [{ id: seed.id, value: seed.risk, depth: 0 }];
    const visited = new Set([seed.id]);

    while (queue.length) {
      const cur = queue.shift();
      if (cur.depth >= 4 || cur.value <= 8) continue;

      const out = model.adjacencyOut.get(cur.id) || [];
      const incoming = model.adjacencyIn.get(cur.id) || [];

      for (const edge of [...out, ...incoming]) {
        const targetId = edge.source === cur.id ? edge.target : edge.source;
        const weight = decayByEdge[edge.type] || 0.55;
        const nextValue = cur.value * weight;
        const prev = propagated.get(targetId) || 0;
        if (nextValue > prev) propagated.set(targetId, Math.min(100, nextValue));

        if (!visited.has(targetId)) {
          visited.add(targetId);
          queue.push({ id: targetId, value: nextValue, depth: cur.depth + 1 });
        }
      }
    }
  }

  return propagated;
}

function buildNodeDependencyView(model, nodeId) {
  const node = model.nodeById.get(nodeId);
  if (!node) {
    return {
      direct_callers: [],
      direct_callees: [],
      indirect_links: [],
    };
  }

  const callers = (model.adjacencyIn.get(nodeId) || []).map((edge) => ({
    node_id: edge.source,
    relation: edge.type,
    confidence: edge.confidence,
  }));

  const callees = (model.adjacencyOut.get(nodeId) || []).map((edge) => ({
    node_id: edge.target,
    relation: edge.type,
    confidence: edge.confidence,
  }));

  const indirect = [];
  for (const out of model.adjacencyOut.get(nodeId) || []) {
    for (const second of model.adjacencyOut.get(out.target) || []) {
      indirect.push({
        through: out.target,
        node_id: second.target,
        relation_chain: `${out.type}->${second.type}`,
      });
      if (indirect.length >= 12) break;
    }
    if (indirect.length >= 12) break;
  }

  return {
    direct_callers: callers,
    direct_callees: callees,
    indirect_links: indirect,
  };
}

function findSimilarNodes(model, node, limit = 5) {
  const peers = model.nodes.filter((n) => n.id !== node.id && n.type === node.type);
  const ranked = peers
    .map((peer) => ({
      node_id: peer.id,
      label: peer.label,
      score: Number((scoreOverlap(node.tokens, peer.tokens) * 100).toFixed(2)),
      reason: "semantic_name_path_similarity",
    }))
    .filter((x) => x.score > 25)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
  return ranked;
}

function searchNodes(model, query, limit = 20) {
  const queryTokens = tokenize(query);
  if (!queryTokens.length) return [];

  return model.searchIndex
    .map((entry) => {
      const node = model.nodeById.get(entry.nodeId);
      const score = scoreOverlap(queryTokens, entry.tokens);
      return {
        node,
        score,
      };
    })
    .filter((x) => x.score > 0.08)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

function buildArchitectureInsights(model, propagatedRisk) {
  const fileNodes = model.nodes.filter((n) => n.type === "file");
  const ranked = fileNodes
    .map((node) => {
      const inDegree = (model.adjacencyIn.get(node.id) || []).length;
      const outDegree = (model.adjacencyOut.get(node.id) || []).length;
      return {
        node,
        inDegree,
        outDegree,
        centrality: inDegree + outDegree,
        propagatedRisk: propagatedRisk.get(node.id) || 0,
      };
    })
    .sort((a, b) => b.centrality - a.centrality);

  const criticalModules = ranked.slice(0, 3).map((r) => ({
    node_id: r.node.id,
    centrality: r.centrality,
    propagated_risk: Number(r.propagatedRisk.toFixed(2)),
  }));

  const bottlenecks = ranked
    .filter((r) => r.inDegree >= 2 && r.outDegree >= 2)
    .slice(0, 3)
    .map((r) => ({
      node_id: r.node.id,
      fan_in: r.inDegree,
      fan_out: r.outDegree,
    }));

  const cycles = [];
  for (const edge of model.edges.filter((e) => e.type === "import")) {
    const reverseId = `import:${edge.target}->${edge.source}`;
    if (model.edges.find((e) => e.id === reverseId)) {
      cycles.push({ a: edge.source, b: edge.target });
    }
    if (cycles.length >= 4) break;
  }

  return {
    system_structure: {
      files: fileNodes.length,
      symbols: model.nodes.length - fileNodes.length,
      edges: model.edges.length,
    },
    critical_modules: criticalModules,
    bottlenecks,
    anti_patterns: {
      circular_import_pairs: cycles,
    },
  };
}

export function analyzeWithMcp({ repoName = "repo1", repoPath = null, query = "", nodeId = null, limit = 12, mode = "normal" }) {
  const model = buildModel(repoName, repoPath);

  if (!model.repoDir) {
    return {
      meta: { repo: repoName, found: false },
      summary: "Repository was not found.",
      dependencies: { direct_callers: [], direct_callees: [], indirect_links: [] },
      risk: { local_score: 0, propagated_score: 0, level: "LOW" },
      similar_nodes: [],
      insights: {},
      matches: [],
      ui_hints: { highlight_node_ids: [], highlight_edge_ids: [], mode },
    };
  }

  const localRiskMap = new Map(model.nodes.map((node) => [node.id, computeLocalRisk(node)]));
  const propagatedRiskMap = computePropagatedRisk(model, localRiskMap);

  let selectedNode = nodeId ? model.nodeById.get(nodeId) : null;
  const matches = query
    ? searchNodes(model, query, Math.max(8, limit)).map((item) => ({
        node_id: item.node.id,
        label: item.node.label,
        type: item.node.type,
        score: Number((item.score * 100).toFixed(2)),
        reason: "semantic_relevance",
      }))
    : [];

  if (!selectedNode && matches.length) selectedNode = model.nodeById.get(matches[0].node_id);
  if (!selectedNode) {
    const risky = [...model.nodes]
      .sort((a, b) => (propagatedRiskMap.get(b.id) || 0) - (propagatedRiskMap.get(a.id) || 0))[0];
    selectedNode = risky || null;
  }

  const dependencies = selectedNode ? buildNodeDependencyView(model, selectedNode.id) : { direct_callers: [], direct_callees: [], indirect_links: [] };
  const localScore = selectedNode ? localRiskMap.get(selectedNode.id) || 0 : 0;
  const propagatedScore = selectedNode ? propagatedRiskMap.get(selectedNode.id) || 0 : 0;
  const similarNodes = selectedNode ? findSimilarNodes(model, selectedNode, 5) : [];
  const insights = buildArchitectureInsights(model, propagatedRiskMap);

  const highlightNodeIds = unique([
    ...(selectedNode ? [selectedNode.id] : []),
    ...matches.slice(0, limit).map((m) => m.node_id),
    ...dependencies.direct_callees.slice(0, 8).map((d) => d.node_id),
    ...dependencies.direct_callers.slice(0, 8).map((d) => d.node_id),
  ]);

  const highlightEdgeIds = model.edges
    .filter((edge) => highlightNodeIds.includes(edge.source) || highlightNodeIds.includes(edge.target))
    .slice(0, 30)
    .map((edge) => edge.id);

  return {
    meta: {
      repo: repoName,
      found: true,
      built_at: model.builtAt,
      cache_hit: model.cacheHit,
      node_count: model.nodes.length,
      edge_count: model.edges.length,
      mode,
    },
    summary: selectedNode
      ? `MCP focused on ${selectedNode.type} '${selectedNode.label}' and analyzed cross-file dependencies, risk flow, and semantic relevance.`
      : "MCP analyzed the repository graph and generated architecture intelligence.",
    focus_node: selectedNode
      ? {
          node_id: selectedNode.id,
          label: selectedNode.label,
          type: selectedNode.type,
          path: selectedNode.path,
        }
      : null,
    dependencies,
    risk: {
      local_score: Number(localScore.toFixed(2)),
      propagated_score: Number(propagatedScore.toFixed(2)),
      local_level: riskLevel(localScore),
      propagated_level: riskLevel(propagatedScore),
      propagation_note: "Risk propagates across import, semantic call, and containment edges with weighted decay.",
    },
    similar_nodes: similarNodes,
    insights,
    matches: matches.slice(0, limit),
    ui_hints: {
      highlight_node_ids: highlightNodeIds,
      highlight_edge_ids: highlightEdgeIds,
      risk_hotspots: model.nodes
        .sort((a, b) => (propagatedRiskMap.get(b.id) || 0) - (propagatedRiskMap.get(a.id) || 0))
        .slice(0, 10)
        .map((n) => ({ node_id: n.id, propagated_score: Number((propagatedRiskMap.get(n.id) || 0).toFixed(2)) })),
      focus_camera_node_id: selectedNode ? selectedNode.id : null,
      render_mode: mode,
    },
  };
}
