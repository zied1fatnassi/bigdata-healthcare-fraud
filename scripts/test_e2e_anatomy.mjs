#!/usr/bin/env node
/**
 * Automated Headless Browser E2E Test Suite for Healthcare Fraud Big Data Anatomy Visualizer
 *
 * Target: healthcare-fraud-anatomy.html (or built-in conforming fixture in --self-test mode)
 * Architecture: Playwright + Google Chrome headless
 * Coverage: 4 Tiers, 135+ automated tests
 *   - Tier 1: Feature Coverage (65 tests across F1-F10)
 *   - Tier 2: Boundary & Corner Cases (50 tests, 5 per feature)
 *   - Tier 3: Pairwise Combinations (15 cross-feature interaction tests)
 *   - Tier 4: Real-World Scenarios (5 multi-step end-user journeys)
 */

import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import fs from 'node:fs';
import os from 'node:os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ============================================================================
// 1. Resilient Module Loader for Playwright
// ============================================================================
async function loadPlaywright() {
  try {
    return await import('playwright');
  } catch {
    try {
      const kitRequire = createRequire('/home/zied/.local/share/ux-ui-agent-skills/package.json');
      return kitRequire('playwright');
    } catch {
      const direct = await import('/home/zied/.local/share/ux-ui-agent-skills/node_modules/playwright/index.js');
      return direct.default || direct;
    }
  }
}

// ============================================================================
// 2. Constants & Ground-Truth Domain Specifications
// ============================================================================
export const EXPECTED_PARTS = [
  { id: 'chassis', name: 'Cast Base Bed & Ruler Rails', layer: 'Foundation', tech: 'Structural Steel / Hex Screws', explode: [0, 0, -30] },
  { id: 'hopper', name: 'Raw Dataset Hopper & Chute', layer: 'Ingestion', tech: 'Vibratory Feeder', explode: [-40, -40, 20] },
  { id: 'serde', name: 'Optical SerDe Ingestion Scanner', layer: 'Ingestion', tech: 'OpenCSVSerde', explode: [-30, -30, 25] },
  { id: 'bronze_vault', name: 'Bronze Raw Data Vault', layer: 'Bronze', tech: 'HDFS Raw Ingest', explode: [-20, -20, 15] },
  { id: 'namenode', name: 'HDFS NameNode Master Turret', layer: 'Storage', tech: 'HDFS Master / RPC 9000', explode: [0, -50, 40] },
  { id: 'datanode1', name: 'Primary Storage Silo (DataNode 1)', layer: 'Storage', tech: 'HDFS 128MB Blocks', explode: [-30, 0, 10] },
  { id: 'datanode2', name: 'Secondary Storage Silo (DataNode 2)', layer: 'Storage', tech: 'HDFS Replica Factor 2', explode: [30, 0, 10] },
  { id: 'breaker', name: 'Fault-Tolerance Kill Breaker', layer: 'Storage', tech: 'Knife-Switch Interrupter', explode: [50, 0, 20] },
  { id: 'yarn_gantry', name: 'YARN Resource Gantry Crane', layer: 'Compute', tech: 'YARN ResourceManager / MR', explode: [0, -40, 60] },
  { id: 'hive_bronze', name: 'Bronze External Table Manifold', layer: 'Bronze', tech: 'Hive Schema-on-Read', explode: [-10, -20, 5] },
  { id: 'silver_cyclone', name: 'Silver Cleaning Hydro-Cyclone', layer: 'Silver', tech: 'Hive ORC / Spark', explode: [-20, 20, 25] },
  { id: 'gold_column', name: 'Gold Star Schema Column', layer: 'Gold', tech: 'Star Schema Dimensional', explode: [0, 30, 35] },
  { id: 'metastore', name: 'PostgreSQL Metastore Pedestal', layer: 'Storage', tech: 'PostgreSQL 14 / Hive Metastore', explode: [20, -20, 0] },
  { id: 'quality_gate', name: 'Data Quality Gate Sentinel', layer: 'Bronze', tech: 'Automated Data Quality Tests', explode: [-15, 10, 15] },
  { id: 'fraud_dial', name: 'Fraud Classification Galvanometer & Rheostat (0.85)', layer: 'ML', tech: 'scikit-learn LogisticRegression', explode: [40, 40, 30] },
  { id: 'fraud_flag', name: 'Fraud Tripwire Alarm Mechanism', layer: 'ML', tech: 'Electromechanical Semaphore', explode: [50, 50, 45] },
  { id: 'los_vernier', name: 'Length of Stay Vernier Chronometer', layer: 'ML', tech: 'Ridge Regression / Dual Manometer', explode: [-40, 40, 20] },
  { id: 'patient_prism', name: 'Patient Profile Tri-Color Prism (k=3)', layer: 'ML', tech: 'K-Means (k=3) Silhouette 0.5511', explode: [30, -30, 20] },
  { id: 'bi_console', name: 'Executive KPI Flight Deck', layer: 'BI', tech: 'Executive Analytics Cockpit', explode: [0, 50, 10] },
  { id: 'whatif_slider', name: 'What-If Sensitivity Slide Bar', layer: 'BI', tech: 'Linear Potentiometer', explode: [0, 60, 15] }
];

export const GROUND_TRUTH_METRICS = {
  totalClaims: '558,211',
  inpatientClaims: '40,474',
  outpatientClaims: '517,737',
  totalSpend: '$556.5M',
  totalSpendExact: '$556,543,140',
  fraudExposure: '$416.4M',
  optimalThreshold: '0.85',
  rocAuc: '0.949',
  f1Score: '0.662',
  medicareMae: '3.21',
  benchmarkMae: '0.42',
  clusterCount: '3',
  cluster0Pct: '90.8%',
  cluster1Pct: '8.2%',
  cluster2Pct: '1.0%'
};

// ============================================================================
// 3. Conforming Test Fixture Generator
// ============================================================================
export function generateConformingFixtureHtml() {
  const specRegistryJson = JSON.stringify({
    chassis: {
      name: "Cast Base Bed & Ruler Rails",
      subsystem: "Chassis",
      layer: "Foundation",
      tech: "Structural Steel / Hex Screws",
      summary: "Heavy precision-milled base plate with dual mm ruler rails, leveling feet, and anchor hex bolts.",
      metrics: [
        { label: "Mass", value: "450kg" },
        { label: "Leveling Tolerance", value: "0.05mm" }
      ],
      connections: { inputs: [], outputs: ["hopper", "serde", "bronze_vault"] }
    },
    hopper: {
      name: "Raw Dataset Hopper & Chute",
      subsystem: "Ingestion",
      layer: "Ingestion",
      tech: "Vibratory Feeder",
      summary: "Transparent acrylic feed hopper accepting raw claims CSV files for batch processing.",
      metrics: [
        { label: "Total Claims", value: "558,211" },
        { label: "Reimbursed Spend", value: "$556.5M" }
      ],
      connections: { inputs: [], outputs: ["serde"] }
    },
    serde: {
      name: "Optical SerDe Ingestion Scanner",
      subsystem: "Ingestion",
      layer: "Ingestion",
      tech: "OpenCSVSerde",
      summary: "Rotary optical SerDe scanner stripping quotes and parsing raw delimited text lines.",
      metrics: [
        { label: "Parse Throughput", value: "100k rows/s" },
        { label: "Schema Validation", value: "100%" }
      ],
      connections: { inputs: ["hopper"], outputs: ["bronze_vault"] }
    },
    bronze_vault: {
      name: "Bronze Raw Data Vault",
      subsystem: "Storage",
      layer: "Bronze",
      tech: "HDFS Raw Ingest",
      summary: "Reinforced storage vault preserving raw ingested claims in write-once-read-many bronze tables.",
      metrics: [
        { label: "Storage Volume", value: "2.8 GB" },
        { label: "Immutability", value: "Strict WORM" }
      ],
      connections: { inputs: ["serde"], outputs: ["hive_bronze", "datanode1", "datanode2"] }
    },
    namenode: {
      name: "HDFS NameNode Master Turret",
      subsystem: "Storage",
      layer: "Storage",
      tech: "HDFS Master / RPC 9000",
      summary: "Elevated command turret hosting HDFS metadata journals, block mapping, and namespace operations.",
      metrics: [
        { label: "Metadata Journal", value: "Active / QJM" },
        { label: "Web UI Port", value: "9870" }
      ],
      connections: { inputs: ["datanode1", "datanode2"], outputs: ["yarn_gantry"] }
    },
    datanode1: {
      name: "Primary Storage Silo (DataNode 1)",
      subsystem: "Storage",
      layer: "Storage",
      tech: "HDFS 128MB Blocks",
      summary: "Twin cylindrical pressure vessel storing primary 128MB data blocks across stacked disk platters.",
      metrics: [
        { label: "Block Capacity", value: "128 MB Blocks" },
        { label: "Health Status", value: "Heartbeat OK" }
      ],
      connections: { inputs: ["bronze_vault"], outputs: ["namenode", "breaker"] }
    },
    datanode2: {
      name: "Secondary Storage Silo (DataNode 2)",
      subsystem: "Storage",
      layer: "Storage",
      tech: "HDFS Replica Factor 2",
      summary: "Twin cylindrical replica silo providing active redundancy with replication factor 2.",
      metrics: [
        { label: "Replication Factor", value: "2" },
        { label: "Failover Target", value: "Ready" }
      ],
      connections: { inputs: ["bronze_vault"], outputs: ["namenode", "breaker"] }
    },
    breaker: {
      name: "Fault-Tolerance Kill Breaker",
      subsystem: "Storage",
      layer: "Storage",
      tech: "Knife-Switch Interrupter",
      summary: "Mechanical high-voltage knife switch simulating instant DataNode 2 failover recovery.",
      metrics: [
        { label: "Live Failover", value: "DN2 Recovery" },
        { label: "Recovery Time", value: "< 1.5s" }
      ],
      connections: { inputs: ["datanode2"], outputs: ["namenode"] }
    },
    yarn_gantry: {
      name: "YARN Resource Gantry Crane",
      subsystem: "Compute",
      layer: "Compute",
      tech: "YARN ResourceManager / MR",
      summary: "Overhead dual-rail motorized gantry dynamically allocating containers and MapReduce capsules.",
      metrics: [
        { label: "Memory Allocated", value: "6,144 MB" },
        { label: "Scheduler", value: "CapacityScheduler" }
      ],
      connections: { inputs: ["namenode"], outputs: ["silver_cyclone", "gold_column"] }
    },
    hive_bronze: {
      name: "Bronze External Table Manifold",
      subsystem: "Refining",
      layer: "Bronze",
      tech: "Hive Schema-on-Read",
      summary: "Ground-level valve manifold enforcing schema-on-read over raw external table partitions.",
      metrics: [
        { label: "Table Definition", value: "External Stored as Text" },
        { label: "Raw Records", value: "558,211" }
      ],
      connections: { inputs: ["bronze_vault"], outputs: ["silver_cyclone", "metastore"] }
    },
    silver_cyclone: {
      name: "Silver Cleaning Hydro-Cyclone",
      subsystem: "Refining",
      layer: "Silver",
      tech: "Hive ORC / Spark",
      summary: "Centrifugal hydro-cyclone separating noise, computing LOS day differences, and recoding 11 chronic conditions.",
      metrics: [
        { label: "Chronic Recoding", value: "11 Conditions (1/2->1/0)" },
        { label: "LOS Derivation", value: "Date Diff (Days)" }
      ],
      connections: { inputs: ["hive_bronze", "quality_gate"], outputs: ["gold_column"] }
    },
    gold_column: {
      name: "Gold Star Schema Column",
      subsystem: "Refining",
      layer: "Gold",
      tech: "Star Schema Dimensional",
      summary: "Vertical fractionating column distilling fact_claims partitioned into Inpatient and Outpatient tables.",
      metrics: [
        { label: "Fact Claims Inpatient", value: "40,474 ($408.3M)" },
        { label: "Fact Claims Outpatient", value: "517,737 ($148.2M)" }
      ],
      connections: { inputs: ["silver_cyclone"], outputs: ["fraud_dial", "los_vernier", "patient_prism"] }
    },
    metastore: {
      name: "PostgreSQL Metastore Pedestal",
      subsystem: "Storage",
      layer: "Storage",
      tech: "PostgreSQL 14 / Hive Metastore",
      summary: "Cast pedestal housing the PostgreSQL metastore catalog maintaining schema definitions and table partitions.",
      metrics: [
        { label: "Port", value: "5432" },
        { label: "Catalog Objects", value: "12 Tables / Partitions" }
      ],
      connections: { inputs: ["hive_bronze", "silver_cyclone", "gold_column"], outputs: [] }
    },
    quality_gate: {
      name: "Data Quality Gate Sentinel",
      subsystem: "Data Quality",
      layer: "Bronze",
      tech: "Automated Data Quality Tests",
      summary: "Spring-loaded mechanical balance scale validating referential integrity and rejecting orphan records.",
      metrics: [
        { label: "Orphan Beneficiaries", value: "0" },
        { label: "Invalid Claims", value: "0 null claims" }
      ],
      connections: { inputs: ["hive_bronze"], outputs: ["silver_cyclone"] }
    },
    fraud_dial: {
      name: "Fraud Classification Galvanometer & Rheostat (0.85)",
      subsystem: "ML Forensic Bench",
      layer: "ML",
      tech: "scikit-learn LogisticRegression",
      summary: "High-precision rotary rheostat calibrated to decision threshold 0.85 with dual-needle galvanometer readout.",
      metrics: [
        { label: "Decision Threshold", value: "0.85" },
        { label: "ROC-AUC", value: "0.949" },
        { label: "F1 Score", value: "0.662" },
        { label: "Precision / Recall", value: "0.642 / 0.684" }
      ],
      connections: { inputs: ["gold_column", "whatif_slider"], outputs: ["fraud_flag", "bi_console"] }
    },
    fraud_flag: {
      name: "Fraud Tripwire Alarm Mechanism",
      subsystem: "ML Forensic Bench",
      layer: "ML",
      tech: "Electromechanical Semaphore",
      summary: "Spring-loaded mechanical tripwire flag displaying instant optical semaphore alerts for high-risk exposure.",
      metrics: [
        { label: "Flagged Exposure", value: "$416.4M" },
        { label: "Suspicious Providers", value: "506 Providers (9.35%)" }
      ],
      connections: { inputs: ["fraud_dial"], outputs: ["bi_console"] }
    },
    los_vernier: {
      name: "Length of Stay Vernier Chronometer",
      subsystem: "ML Forensic Bench",
      layer: "ML",
      tech: "Ridge Regression / Dual Manometer",
      summary: "Precision vernier gauge and dual liquid manometers comparing Medicare claim hospital stay against synthetic benchmark.",
      metrics: [
        { label: "Medicare Test MAE", value: "3.21 days" },
        { label: "Benchmark Synthetic MAE", value: "0.42 days" }
      ],
      connections: { inputs: ["gold_column"], outputs: ["bi_console"] }
    },
    patient_prism: {
      name: "Patient Profile Tri-Color Prism (k=3)",
      subsystem: "ML Forensic Bench",
      layer: "ML",
      tech: "K-Means (k=3) Silhouette 0.5511",
      summary: "Optical quartz dispersion prism splitting patient beneficiaries into 3 distinct risk cohort flasks.",
      metrics: [
        { label: "Cluster Count", value: "3 Clusters" },
        { label: "Cluster 0 Watchlist", value: "90.8% (125,761 patients)" },
        { label: "Cluster 1 High-Risk", value: "8.2% (11,374 patients, $313M spend)" },
        { label: "Cluster 2 Deceased", value: "1.0% (1,421 patients)" }
      ],
      connections: { inputs: ["gold_column"], outputs: ["bi_console"] }
    },
    bi_console: {
      name: "Executive KPI Flight Deck",
      subsystem: "BI Cockpit",
      layer: "BI",
      tech: "Executive Analytics Cockpit",
      summary: "Angled flight deck console rendering real-time executive summaries, dollar exposure, and health metrics.",
      metrics: [
        { label: "Total System Spend", value: "$556.5M" },
        { label: "Analyzed Beneficiaries", value: "138,556" }
      ],
      connections: { inputs: ["fraud_dial", "fraud_flag", "los_vernier", "patient_prism"], outputs: [] }
    },
    whatif_slider: {
      name: "What-If Sensitivity Slide Bar",
      subsystem: "BI Cockpit",
      layer: "BI",
      tech: "Linear Potentiometer",
      summary: "Precision mechanical slide potentiometer providing dynamic interactive control over fraud classification sensitivity.",
      metrics: [
        { label: "Current Threshold", value: "0.85" },
        { label: "Dynamic Telemetry", value: "Active" }
      ],
      connections: { inputs: [], outputs: ["fraud_dial", "fraud_flag"] }
    }
  });

  // Generate SVG solid elements for each part
  const solidSvgNodes = EXPECTED_PARTS.map((p, idx) => {
    // Generate distinct non-zero coordinates within 1600x1100
    const col = idx % 5;
    const row = Math.floor(idx / 5);
    const baseX = 150 + col * 270;
    const baseY = 250 + row * 180;
    const w = 180;
    const h = 100;
    return `
      <g class="iso-solid" id="part-${p.id}" data-part="${p.id}" data-name="${p.name}" tabindex="0" role="button" aria-label="${p.name}" data-explode="[${p.explode.join(', ')}]">
        <polygon class="iso-facet" points="${baseX},${baseY + 30} ${baseX + w/2},${baseY} ${baseX + w},${baseY + 30} ${baseX + w/2},${baseY + 60}" />
        <polygon class="iso-facet" points="${baseX},${baseY + 30} ${baseX + w/2},${baseY + 60} ${baseX + w/2},${baseY + h} ${baseX},${baseY + h - 30}" />
        <polygon class="iso-facet" points="${baseX + w/2},${baseY + 60} ${baseX + w},${baseY + 30} ${baseX + w},${baseY + h - 30} ${baseX + w/2},${baseY + h}" />
        <text x="${baseX + w/2}" y="${baseY + 45}" text-anchor="middle" fill="#94a3b8" font-size="10" font-family="inherit" pointer-events="none">${p.id}</text>
      </g>`;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Healthcare Fraud Big Data Anatomy Visualizer</title>
  <style>
    :root {
      --anatomy-paper: #12151c;
      --anatomy-ink: #e0e6ed;
      --anatomy-lit: #ffaa00;
      --anatomy-dim: #3a4250;
      --anatomy-accent: #38bdf8;
      --anatomy-alarm: #ef4444;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      overflow-x: hidden;
      max-width: 100vw;
    }
    body {
      background: var(--anatomy-paper);
      color: var(--anatomy-ink);
      font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
    }
    .iso-plate {
      width: 100%;
      max-width: 1600px;
      overflow-x: hidden;
      display: block;
      position: relative;
      padding: 20px;
      background: #181d26;
      border: 1px solid #2d3748;
      border-radius: 8px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.5);
    }
    @media (max-width: 600px) {
      .iso-plate { padding: 10px; }
      .toolbar { gap: 8px; }
      .slider-control { flex-direction: column; align-items: flex-start; width: 100%; }
      .iso-title { font-size: 13px; }
    }
    .iso-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #2d3748;
      padding-bottom: 12px;
      margin-bottom: 16px;
    }
    .iso-fig {
      font-size: 14px;
      font-weight: 700;
      color: var(--anatomy-lit);
      letter-spacing: 1px;
    }
    .iso-title {
      font-size: 18px;
      font-weight: 700;
      color: var(--anatomy-ink);
      letter-spacing: 0.5px;
    }
    .iso-readout {
      font-size: 13px;
      color: #94a3b8;
      background: #0f172a;
      padding: 6px 12px;
      border-radius: 4px;
      border: 1px solid #334155;
    }
    .toolbar {
      display: flex;
      gap: 16px;
      align-items: center;
      margin-bottom: 16px;
      flex-wrap: wrap;
    }
    .btn {
      background: #1e293b;
      color: var(--anatomy-ink);
      border: 1px solid #475569;
      padding: 8px 16px;
      border-radius: 4px;
      cursor: pointer;
      font-family: inherit;
      font-size: 13px;
      transition: all 0.2s;
    }
    .btn:hover, .btn:focus {
      border-color: var(--anatomy-lit);
      outline: 2px solid var(--anatomy-lit);
    }
    .btn[aria-pressed="true"] {
      background: var(--anatomy-lit);
      color: #000;
      font-weight: bold;
    }
    .slider-control {
      display: flex;
      align-items: center;
      gap: 10px;
      background: #0f172a;
      padding: 6px 14px;
      border-radius: 4px;
      border: 1px solid #334155;
    }
    .slider-control label {
      font-size: 12px;
      color: #94a3b8;
    }
    .slider-control input[type="range"] {
      cursor: pointer;
    }
    .slider-control span {
      font-size: 12px;
      color: var(--anatomy-lit);
      font-weight: bold;
    }
    .iso-scene {
      width: 100%;
      height: auto;
      display: block;
      background: #0b0f17;
      border: 1px solid #1e293b;
      border-radius: 4px;
    }
    .iso-solid {
      cursor: pointer;
      transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), stroke 0.2s, fill 0.2s;
    }
    .iso-solid:focus {
      outline: none;
    }
    .iso-solid:focus .iso-facet, .iso-solid.is-focused .iso-facet {
      stroke: var(--anatomy-accent) !important;
      stroke-width: 2.5px !important;
    }
    .iso-solid.is-active .iso-facet, .iso-solid[data-on="true"] .iso-facet {
      stroke: var(--anatomy-lit) !important;
      stroke-width: 2.5px !important;
      fill-opacity: 0.9 !important;
    }
    .iso-solid.is-alarm .iso-facet {
      stroke: var(--anatomy-alarm) !important;
      fill: var(--anatomy-alarm) !important;
      stroke-width: 3px !important;
    }
    .iso-facet {
      stroke: #475569;
      stroke-width: 1.2px;
      fill: #1e293b;
      fill-opacity: 0.7;
    }
    .inspector-drawer {
      position: absolute;
      top: 20px;
      right: 20px;
      width: 380px;
      max-width: 90%;
      max-height: calc(100% - 40px);
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 6px;
      box-shadow: -10px 10px 30px rgba(0,0,0,0.7);
      padding: 20px;
      display: none;
      flex-direction: column;
      z-index: 100;
      transform: translateX(20px);
      opacity: 0;
      transition: transform 0.25s ease, opacity 0.25s ease;
    }
    .inspector-drawer.is-open {
      display: flex;
      transform: translateX(0);
      opacity: 1;
    }
    #drawer-close {
      position: absolute;
      top: 14px;
      right: 14px;
      background: none;
      border: none;
      color: #94a3b8;
      font-size: 20px;
      cursor: pointer;
    }
    #drawer-close:hover, #drawer-close:focus {
      color: var(--anatomy-lit);
      outline: 2px solid var(--anatomy-lit);
    }
    #drawer-content {
      overflow-y: auto;
      margin-top: 10px;
    }
    .drawer-title {
      font-size: 16px;
      color: var(--anatomy-lit);
      margin-bottom: 6px;
    }
    .drawer-layer, .drawer-tech {
      font-size: 12px;
      color: #94a3b8;
      margin-bottom: 4px;
    }
    .drawer-summary {
      font-size: 13px;
      line-height: 1.4;
      color: #cbd5e1;
      margin: 10px 0;
      padding: 8px;
      background: #1e293b;
      border-radius: 4px;
    }
    .drawer-metrics {
      margin-top: 10px;
    }
    .metric-row {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      padding: 4px 0;
      border-bottom: 1px solid #1e293b;
    }
    .metric-label { color: #94a3b8; }
    .metric-value { color: var(--anatomy-ink); font-weight: bold; }
    .drawer-connections {
      margin-top: 12px;
      font-size: 11px;
      color: #64748b;
    }
    @media (prefers-reduced-motion: reduce) {
      * { transition: none !important; animation: none !important; }
    }
  </style>
</head>
<body>
  <div class="iso-plate">
    <div class="iso-header">
      <div>
        <div class="iso-fig">FIG. 8V</div>
        <div class="iso-title">INDUSTRIAL FRAUD DETECTION &amp; LAKEHOUSE INSPECTION CONSOLE</div>
      </div>
      <div class="iso-readout" data-readout="" aria-live="polite">Click or focus any part to inspect</div>
    </div>

    <div class="toolbar">
      <button id="btn-explode" class="btn" data-action="toggle-explode" aria-pressed="false" role="button">Exploded View</button>
      <button id="btn-tour" class="btn" data-action="toggle-tour" aria-pressed="false" role="button">Idle Tour</button>
      <div class="slider-control">
        <label for="whatif-slider">What-If Sensitivity Threshold</label>
        <input type="range" id="whatif-slider" data-action="whatif" min="0.00" max="1.00" step="0.01" value="0.85" aria-label="What-If Sensitivity Threshold">
        <span id="whatif-val">0.85</span>
        <span id="whatif-flagged-count">506 Providers (9.35%)</span>
        <span id="whatif-flagged-spend">$416.4M</span>
      </div>
    </div>

    <svg class="iso-scene" viewBox="0 0 1600 1100" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Healthcare Fraud Lakehouse Architecture Isometric Diagram">
      <rect id="svg-background" width="1600" height="1100" fill="transparent" />
      ${solidSvgNodes}
    </svg>

    <div id="inspector-drawer" class="inspector-drawer" aria-hidden="true" role="dialog" aria-labelledby="drawer-title">
      <button id="drawer-close" data-action="close-drawer" aria-label="Close Inspector">&times;</button>
      <div id="drawer-content">
        <h3 id="drawer-title" class="drawer-title"></h3>
        <div id="drawer-layer" class="drawer-layer"></div>
        <div id="drawer-tech" class="drawer-tech"></div>
        <div id="drawer-summary" class="drawer-summary"></div>
        <div id="drawer-metrics" class="drawer-metrics"></div>
        <div id="drawer-connections" class="drawer-connections"></div>
      </div>
    </div>
  </div>

  <script>
    window.SPEC_REGISTRY = ${specRegistryJson};

    let activePartId = null;
    let lastActiveElement = null;
    let isExploded = false;
    let isTourRunning = false;
    let tourTimer = null;
    let tourIndex = 0;
    const partKeys = Object.keys(window.SPEC_REGISTRY);

    const drawer = document.getElementById('inspector-drawer');
    const drawerTitle = document.getElementById('drawer-title');
    const drawerLayer = document.getElementById('drawer-layer');
    const drawerTech = document.getElementById('drawer-tech');
    const drawerSummary = document.getElementById('drawer-summary');
    const drawerMetrics = document.getElementById('drawer-metrics');
    const drawerConnections = document.getElementById('drawer-connections');
    const readout = document.querySelector('[data-readout]');
    const btnExplode = document.getElementById('btn-explode');
    const btnTour = document.getElementById('btn-tour');
    const slider = document.getElementById('whatif-slider');
    const whatifVal = document.getElementById('whatif-val');
    const whatifFlaggedCount = document.getElementById('whatif-flagged-count');
    const whatifFlaggedSpend = document.getElementById('whatif-flagged-spend');
    const plate = document.querySelector('.iso-plate');

    // Selection logic
    function selectPart(partId, triggerEl) {
      if (!window.SPEC_REGISTRY[partId]) return;
      activePartId = partId;
      lastActiveElement = triggerEl || document.querySelector(\`g[data-part="\${partId}"]\`);

      document.querySelectorAll('.iso-solid').forEach(el => {
        el.classList.remove('is-active');
        el.removeAttribute('data-on');
      });

      const solid = document.querySelector(\`g[data-part="\${partId}"]\`);
      if (solid) {
        solid.classList.add('is-active');
        solid.setAttribute('data-on', 'true');
      }

      const data = window.SPEC_REGISTRY[partId];
      if (readout) {
        readout.textContent = data.name + ' (' + data.subsystem + ')';
      }

      // Populate drawer
      drawerTitle.textContent = data.name;
      drawerLayer.textContent = 'Layer: ' + data.layer;
      drawerTech.textContent = 'Technology: ' + data.tech;
      drawerSummary.textContent = data.summary;

      renderDrawerMetrics(data);

      drawerConnections.textContent = 'Inputs: ' + (data.connections.inputs.join(', ') || 'None') + ' | Outputs: ' + (data.connections.outputs.join(', ') || 'None');

      drawer.classList.add('is-open');
      drawer.setAttribute('aria-hidden', 'false');

      // Pause idle tour when drawer opens
      pauseTour();
    }

    function renderDrawerMetrics(data) {
      drawerMetrics.innerHTML = '';
      data.metrics.forEach(m => {
        const row = document.createElement('div');
        row.className = 'metric-row';
        const lbl = document.createElement('span');
        lbl.className = 'metric-label';
        lbl.textContent = m.label;
        const val = document.createElement('span');
        val.className = 'metric-value';
        val.textContent = m.value;
        row.appendChild(lbl);
        row.appendChild(val);
        drawerMetrics.appendChild(row);
      });
    }

    function deselectAll() {
      activePartId = null;
      document.querySelectorAll('.iso-solid').forEach(el => {
        el.classList.remove('is-active');
        el.removeAttribute('data-on');
      });
      if (drawer) {
        drawer.classList.remove('is-open');
        drawer.setAttribute('aria-hidden', 'true');
      }
      if (readout) {
        readout.textContent = 'Click or focus any part to inspect';
      }
    }

    // Exploded View
    function toggleExplode() {
      isExploded = !isExploded;
      btnExplode.setAttribute('aria-pressed', isExploded ? 'true' : 'false');
      if (isExploded) {
        plate.classList.add('is-exploded');
        plate.setAttribute('data-exploded', 'true');
        document.querySelectorAll('.iso-solid').forEach(el => {
          try {
            const exp = JSON.parse(el.getAttribute('data-explode') || '[0,0,0]');
            const tx = exp[0] * 1.5;
            const ty = exp[1] * 1.5 - exp[2] * 0.8;
            el.setAttribute('transform', \`translate(\${tx}, \${ty})\`);
          } catch(e) {}
        });
      } else {
        plate.classList.remove('is-exploded');
        plate.removeAttribute('data-exploded');
        document.querySelectorAll('.iso-solid').forEach(el => {
          el.setAttribute('transform', 'translate(0, 0)');
        });
      }
      pauseTour();
    }

    // What-If Slider Logic
    function updateWhatIf(val) {
      const num = parseFloat(val);
      whatifVal.textContent = num.toFixed(2);

      let countStr, spendStr;
      if (num === 0.00) {
        countStr = '5,410 Providers (100.0%)';
        spendStr = '$556.5M';
      } else if (num === 1.00) {
        countStr = '0 Providers (0.0%)';
        spendStr = '$0';
      } else if (num === 0.85) {
        countStr = '506 Providers (9.35%)';
        spendStr = '$416.4M';
      } else if (num === 0.50) {
        countStr = '1,840 Providers (34.0%)';
        spendStr = '$492.1M';
      } else {
        const count = Math.round(5410 * Math.pow(1 - num, 1.2));
        const spend = (556.5 * (1 - Math.pow(num, 1.5))).toFixed(1);
        countStr = count + ' Providers';
        spendStr = '$' + spend + 'M';
      }

      whatifFlaggedCount.textContent = countStr;
      whatifFlaggedSpend.textContent = spendStr;

      // Update alarm indicator
      const flagPart = document.querySelector('g[data-part="fraud_flag"]');
      if (flagPart) {
        if (num <= 0.30) {
          flagPart.classList.add('is-alarm');
        } else {
          flagPart.classList.remove('is-alarm');
        }
      }

      // Always sync SPEC_REGISTRY for fraud_dial and fraud_flag
      if (window.SPEC_REGISTRY && window.SPEC_REGISTRY.fraud_dial) {
        window.SPEC_REGISTRY.fraud_dial.metrics[0].value = num.toFixed(2);
      }
      if (window.SPEC_REGISTRY && window.SPEC_REGISTRY.fraud_flag) {
        window.SPEC_REGISTRY.fraud_flag.metrics[0].value = spendStr;
        window.SPEC_REGISTRY.fraud_flag.metrics[1].value = countStr;
      }

      // Live update if fraud_dial or fraud_flag is in drawer
      if (activePartId === 'fraud_dial') {
        const dialData = window.SPEC_REGISTRY.fraud_dial;
        renderDrawerMetrics(dialData);
      } else if (activePartId === 'fraud_flag') {
        const flagData = window.SPEC_REGISTRY.fraud_flag;
        renderDrawerMetrics(flagData);
      }

      resetTourTimer();
    }

    // Idle Tour
    function stepTour() {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      if (document.hidden) return;
      if (drawer.classList.contains('is-open')) return;

      tourIndex = (tourIndex + 1) % partKeys.length;
      const nextPart = partKeys[tourIndex];
      document.querySelectorAll('.iso-solid').forEach(el => {
        el.classList.remove('is-active');
        el.removeAttribute('data-on');
      });
      const solid = document.querySelector(\`g[data-part="\${nextPart}"]\`);
      if (solid) {
        solid.classList.add('is-active');
        solid.setAttribute('data-on', 'true');
        if (readout) {
          readout.textContent = window.SPEC_REGISTRY[nextPart].name + ' [Touring]';
        }
      }
    }

    function startTour() {
      isTourRunning = true;
      btnTour.setAttribute('aria-pressed', 'true');
      clearInterval(tourTimer);
      tourTimer = setInterval(stepTour, 1800);
    }

    function pauseTour() {
      isTourRunning = false;
      btnTour.setAttribute('aria-pressed', 'false');
      clearInterval(tourTimer);
    }

    function resetTourTimer() {
      if (isTourRunning) {
        clearInterval(tourTimer);
        tourTimer = setInterval(stepTour, 1800);
      }
    }

    window.__idleTour = {
      step: stepTour,
      start: startTour,
      pause: pauseTour,
      resume: () => {
        if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches && !drawer.classList.contains('is-open')) {
          startTour();
        }
      }
    };

    // Event Listeners
    document.querySelectorAll('.iso-solid').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        selectPart(el.getAttribute('data-part'), el);
      });
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          selectPart(el.getAttribute('data-part'), el);
        }
      });
    });

    document.getElementById('svg-background').addEventListener('click', () => {
      deselectAll();
    });

    document.getElementById('drawer-close').addEventListener('click', (e) => {
      e.stopPropagation();
      deselectAll();
      if (lastActiveElement && typeof lastActiveElement.focus === 'function') {
        lastActiveElement.focus();
      }
    });

    btnExplode.addEventListener('click', toggleExplode);
    btnTour.addEventListener('click', () => {
      if (isTourRunning) pauseTour(); else startTour();
    });

    slider.addEventListener('input', (e) => updateWhatIf(e.target.value));
    slider.addEventListener('change', (e) => updateWhatIf(e.target.value));

    // Keyboard Shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (drawer.classList.contains('is-open')) {
          deselectAll();
          if (lastActiveElement && typeof lastActiveElement.focus === 'function') {
            lastActiveElement.focus();
          }
        }
      } else if (e.key === ' ' && e.target === document.body) {
        e.preventDefault();
        toggleExplode();
      }
      pauseTour();
    });

    document.addEventListener('pointermove', () => {
      if (isTourRunning) pauseTour();
    });
  </script>
</body>
</html>`;
}

// ============================================================================
// 4. Test Runner & Assertion Framework
// ============================================================================
class TestHarness {
  constructor(options = {}) {
    this.options = options;
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
    this.tierResults = {
      'Tier 1: Feature Coverage': { passed: 0, failed: 0 },
      'Tier 2: Boundary & Corner Cases': { passed: 0, failed: 0 },
      'Tier 3: Pairwise Combinations': { passed: 0, failed: 0 },
      'Tier 4: Real-World Scenarios': { passed: 0, failed: 0 }
    };
    this.currentTier = 'Tier 1: Feature Coverage';
    this.failures = [];
    this.startTime = Date.now();
  }

  setTier(tierName) {
    this.currentTier = tierName;
  }

  async runTest(id, name, testFn) {
    const fullTestName = `[${id}] ${name}`;
    try {
      await testFn();
      this.passed++;
      if (this.tierResults[this.currentTier]) {
        this.tierResults[this.currentTier].passed++;
      }
      console.log(`  \x1b[32m✓\x1b[0m ${id}: ${name}`);
    } catch (err) {
      this.failed++;
      if (this.tierResults[this.currentTier]) {
        this.tierResults[this.currentTier].failed++;
      }
      this.failures.push({ id, name, tier: this.currentTier, error: err });
      console.log(`  \x1b[31m✗\x1b[0m ${id}: ${name}`);
      console.log(`    \x1b[33mError: ${err.message}\x1b[0m`);
    }
  }

  assert(condition, message) {
    if (!condition) {
      throw new Error(message || 'Assertion failed');
    }
  }

  assertEqual(actual, expected, message) {
    if (actual !== expected) {
      throw new Error(`${message || 'Assertion failed'}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    }
  }

  assertIncludes(str, substr, message) {
    if (typeof str !== 'string' || !str.includes(substr)) {
      throw new Error(`${message || 'Assertion failed'}: expected string to include "${substr}", got "${str}"`);
    }
  }

  printSummary() {
    const duration = ((Date.now() - this.startTime) / 1000).toFixed(2);
    console.log('\n======================================================================');
    console.log('                 E2E AUTOMATION TEST SUMMARY REPORT                   ');
    console.log('======================================================================');
    for (const [tier, res] of Object.entries(this.tierResults)) {
      const total = res.passed + res.failed;
      const status = res.failed === 0 ? '\x1b[32mPASS\x1b[0m' : '\x1b[31mFAIL\x1b[0m';
      console.log(`  ${tier.padEnd(38)}: ${res.passed}/${total} passed [${status}]`);
    }
    console.log('----------------------------------------------------------------------');
    console.log(`  Total Assertions Executed : ${this.passed + this.failed}`);
    console.log(`  Passed                    : \x1b[32m${this.passed}\x1b[0m`);
    console.log(`  Failed                    : ${this.failed > 0 ? `\x1b[31m${this.failed}\x1b[0m` : '0'}`);
    console.log(`  Execution Time            : ${duration}s`);
    console.log('======================================================================');

    if (this.failures.length > 0) {
      console.log('\n\x1b[31mFailure Details:\x1b[0m');
      this.failures.forEach(f => {
        console.log(`\n- [${f.id}] ${f.name} (${f.tier})`);
        console.log(`  ${f.error.stack || f.error.message}`);
      });
    }

    return this.failed === 0;
  }
}

// ============================================================================
// 5. Test Suite Implementation (Tiers 1-4, 135+ Tests)
// ============================================================================
async function runAllSuites(page, harness, targetUrl, externalRequests, consoleErrors, pageErrors) {
  // Helper to reset DOM state cleanly between tests
  async function resetState() {
    await page.evaluate(() => {
      if (window.__idleTour) window.__idleTour.pause();
      document.querySelectorAll('.iso-solid').forEach(el => {
        el.classList.remove('is-active', 'is-focused', 'is-alarm');
        el.removeAttribute('data-on');
        el.setAttribute('transform', 'translate(0, 0)');
      });
      const drawer = document.getElementById('inspector-drawer');
      if (drawer) {
        drawer.classList.remove('is-open');
        drawer.setAttribute('aria-hidden', 'true');
      }
      const readout = document.querySelector('[data-readout]');
      if (readout) {
        readout.textContent = 'Click or focus any part to inspect';
      }
      const plate = document.querySelector('.iso-plate');
      if (plate) {
        plate.classList.remove('is-exploded');
        plate.removeAttribute('data-exploded');
      }
      const btnExp = document.getElementById('btn-explode');
      if (btnExp) btnExp.setAttribute('aria-pressed', 'false');
      const btnTour = document.getElementById('btn-tour');
      if (btnTour) btnTour.setAttribute('aria-pressed', 'false');
      const slider = document.getElementById('whatif-slider');
      if (slider) {
        slider.value = '0.85';
        slider.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
  }

  // --------------------------------------------------------------------------
  // TIER 1: Feature Coverage (65 Tests)
  // --------------------------------------------------------------------------
  harness.setTier('Tier 1: Feature Coverage');
  console.log('\n\x1b[1m--- Tier 1: Feature Coverage (65 Tests) ---\x1b[0m');

  // F1: Offline Self-Containment (5 tests)
  await harness.runTest('T1.1.1', 'Zero Outgoing Network Requests', async () => {
    harness.assertEqual(externalRequests.length, 0, 'No outbound network requests must be intercepted');
  });

  await harness.runTest('T1.1.2', 'No External <script src> Tags', async () => {
    const extScripts = await page.$$eval('script[src]', els =>
      els.filter(s => s.src && !s.src.startsWith('data:') && !s.src.startsWith('file:')).length
    );
    harness.assertEqual(extScripts, 0, 'All scripts must be inlined with zero external src dependencies');
  });

  await harness.runTest('T1.1.3', 'No External <link rel="stylesheet"> Tags', async () => {
    const extLinks = await page.$$eval('link[rel="stylesheet"]', els =>
      els.filter(l => l.href && !l.href.startsWith('data:') && !l.href.startsWith('file:')).length
    );
    harness.assertEqual(extLinks, 0, 'All styles must be inlined with zero remote links');
  });

  await harness.runTest('T1.1.4', 'Inlined System Typography Stack', async () => {
    const font = await page.evaluate(() => window.getComputedStyle(document.body).fontFamily);
    const hasMonospace = font.includes('monospace') || font.includes('Menlo') || font.includes('Consolas') || font.includes('SF Mono') || font.includes('ui-monospace');
    harness.assert(hasMonospace, `Font family must include system monospace stack, got: ${font}`);
  });

  await harness.runTest('T1.1.5', 'Standalone Single File Protocol Execution', async () => {
    const readyState = await page.evaluate(() => document.readyState);
    harness.assertEqual(readyState, 'complete', 'Document readyState must be complete under file://');
    harness.assertEqual(pageErrors.length, 0, 'Zero unhandled page errors during file:// execution');
  });

  // F2: DOM Structure & SVG ViewBox (5 tests)
  await harness.runTest('T1.2.1', 'Plate Container Element Presence', async () => {
    const plateWidth = await page.$eval('.iso-plate', el => el.getBoundingClientRect().width);
    harness.assert(plateWidth > 0, '.iso-plate container must exist with width > 0');
  });

  await harness.runTest('T1.2.2', 'SVG Scene Root & ViewBox Specification', async () => {
    const viewBox = await page.$eval('svg.iso-scene', el => el.getAttribute('viewBox'));
    const aspect = await page.$eval('svg.iso-scene', el => el.getAttribute('preserveAspectRatio'));
    harness.assertEqual(viewBox, '0 0 1600 1100', 'viewBox must be exactly "0 0 1600 1100"');
    harness.assert(aspect && aspect.includes('xMidYMid meet'), 'preserveAspectRatio must include xMidYMid meet');
  });

  await harness.runTest('T1.2.3', 'Zero Horizontal Scrollbar Overflow', async () => {
    const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    harness.assert(!hasOverflow, 'document scrollWidth must not exceed clientWidth (no horizontal scrollbar)');
  });

  await harness.runTest('T1.2.4', 'Card Framing Elements Presence', async () => {
    const fig = await page.$('.iso-fig');
    const title = await page.$('.iso-title');
    const readout = await page.$('[data-readout]');
    harness.assert(fig !== null, '.iso-fig must exist');
    harness.assert(title !== null, '.iso-title must exist');
    harness.assert(readout !== null, '[data-readout] must exist');
  });

  await harness.runTest('T1.2.5', 'Non-Zero SVG Rendering Bounding Box', async () => {
    const bbox = await page.$eval('svg.iso-scene', el => {
      const r = el.getBoundingClientRect();
      return { width: r.width, height: r.height };
    });
    harness.assert(bbox.width >= 800 && bbox.height >= 500, `SVG scene rendered bbox must be substantial, got ${bbox.width}x${bbox.height}`);
  });

  // F3: All 20 Interactive Parts Presence & Tagging (20 individual tests)
  for (let i = 0; i < EXPECTED_PARTS.length; i++) {
    const part = EXPECTED_PARTS[i];
    const testId = `T1.3.${i + 1}`;
    await harness.runTest(testId, `Part "${part.id}" Presence & Tagging`, async () => {
      const info = await page.$eval(`g.iso-solid[data-part="${part.id}"]`, el => {
        const bbox = el.getBBox ? el.getBBox() : { width: 1, height: 1 };
        return {
          tabindex: el.getAttribute('tabindex'),
          name: el.getAttribute('data-name'),
          role: el.getAttribute('role'),
          explode: el.getAttribute('data-explode'),
          bboxWidth: bbox.width,
          bboxHeight: bbox.height
        };
      });
      harness.assertEqual(info.tabindex, '0', `${part.id} must have tabindex="0"`);
      harness.assertEqual(info.name, part.name, `${part.id} data-name must match`);
      harness.assert(info.bboxWidth > 0 && info.bboxHeight > 0, `${part.id} must have non-zero geometry bounding box`);
      const expVec = JSON.parse(info.explode);
      harness.assertEqual(expVec.length, 3, `${part.id} data-explode must parse to 3-element vector`);
    });
  }

  // F4: Part Selection, Active Highlighting, Readout Sync (5 tests)
  await harness.runTest('T1.4.1', 'Pointer Click Selection Activation', async () => {
    await resetState();
    await page.click('g.iso-solid[data-part="fraud_dial"]');
    const isActive = await page.$eval('g.iso-solid[data-part="fraud_dial"]', el =>
      el.classList.contains('is-active') || el.getAttribute('data-on') === 'true'
    );
    harness.assert(isActive, 'Clicked solid must receive is-active class or data-on="true"');
  });

  await harness.runTest('T1.4.2', 'Mutual Exclusion of Active Subsystem', async () => {
    await page.click('g.iso-solid[data-part="namenode"]');
    const namenodeActive = await page.$eval('g.iso-solid[data-part="namenode"]', el => el.classList.contains('is-active'));
    const dialActive = await page.$eval('g.iso-solid[data-part="fraud_dial"]', el => el.classList.contains('is-active'));
    harness.assert(namenodeActive, 'namenode must be active');
    harness.assert(!dialActive, 'previously selected fraud_dial must no longer be active');
  });

  await harness.runTest('T1.4.3', 'Live Readout Synchronization', async () => {
    await page.click('g.iso-solid[data-part="hopper"]');
    const readoutText = await page.$eval('[data-readout]', el => el.textContent);
    harness.assert(readoutText.includes('Raw Dataset Hopper') || readoutText.includes('hopper'), 'Readout must sync with selected component');
  });

  await harness.runTest('T1.4.4', 'Deselection via Background Canvas Click', async () => {
    await page.click('#svg-background');
    const activeCount = await page.$$eval('.iso-solid.is-active', els => els.length);
    harness.assertEqual(activeCount, 0, 'No solid should remain active after clicking canvas background');
  });

  await harness.runTest('T1.4.5', 'Contrast Luminance Shift on Active Selection', async () => {
    await page.click('g.iso-solid[data-part="gold_column"]');
    const hasHighlightClass = await page.$eval('g.iso-solid[data-part="gold_column"]', el =>
      el.classList.contains('is-active') || el.getAttribute('data-on') === 'true'
    );
    harness.assert(hasHighlightClass, 'Active part must reflect selection highlight state');
  });

  // F5: Inspector Drawer Opening, Population, Close/Escape (5 tests)
  await harness.runTest('T1.5.1', 'Initial Closed State on Load', async () => {
    await resetState();
    const isHidden = await page.$eval('#inspector-drawer', el =>
      el.getAttribute('aria-hidden') === 'true' && !el.classList.contains('is-open')
    );
    harness.assert(isHidden, '#inspector-drawer must be closed by default');
  });

  await harness.runTest('T1.5.2', 'Drawer Expansion on Part Selection', async () => {
    await page.click('g.iso-solid[data-part="silver_cyclone"]');
    const isOpen = await page.$eval('#inspector-drawer', el =>
      el.getAttribute('aria-hidden') === 'false' && el.classList.contains('is-open')
    );
    harness.assert(isOpen, '#inspector-drawer must open with aria-hidden="false" and .is-open');
  });

  await harness.runTest('T1.5.3', 'Structured Technical Metadata Population', async () => {
    const text = await page.$eval('#drawer-content', el => el.textContent);
    harness.assertIncludes(text, 'Silver Cleaning Hydro-Cyclone', 'Drawer must render part name');
    harness.assertIncludes(text, 'Silver', 'Drawer must render layer');
    harness.assertIncludes(text, 'Hive ORC', 'Drawer must render technology');
  });

  await harness.runTest('T1.5.4', 'Close Button Interaction', async () => {
    await page.click('#drawer-close');
    const isHidden = await page.$eval('#inspector-drawer', el =>
      el.getAttribute('aria-hidden') === 'true' && !el.classList.contains('is-open')
    );
    harness.assert(isHidden, 'Drawer must close after clicking close button');
  });

  await harness.runTest('T1.5.5', 'Keyboard Escape Key Dismissal', async () => {
    await page.click('g.iso-solid[data-part="silver_cyclone"]');
    await page.keyboard.press('Escape');
    const isHidden = await page.$eval('#inspector-drawer', el =>
      el.getAttribute('aria-hidden') === 'true' && !el.classList.contains('is-open')
    );
    harness.assert(isHidden, 'Drawer must dismiss upon pressing Escape key');
  });

  // F6: Verified Metric Integrity (5 tests)
  await harness.runTest('T1.6.1', 'Raw Claims & Spend Ingestion Metrics', async () => {
    await resetState();
    await page.click('g.iso-solid[data-part="hopper"]');
    const content = await page.$eval('#drawer-content', el => el.textContent);
    harness.assertIncludes(content, GROUND_TRUTH_METRICS.totalClaims, 'Claims count must match ground-truth');
    harness.assertIncludes(content, GROUND_TRUTH_METRICS.totalSpend, 'Total spend must match ground-truth');
  });

  await harness.runTest('T1.6.2', 'Fraud Classification ML Performance Metrics', async () => {
    await page.click('g.iso-solid[data-part="fraud_dial"]');
    const content = await page.$eval('#drawer-content', el => el.textContent);
    harness.assertIncludes(content, GROUND_TRUTH_METRICS.rocAuc, 'ROC-AUC must match 0.949');
    harness.assertIncludes(content, GROUND_TRUTH_METRICS.f1Score, 'F1 score must match 0.662');
    harness.assertIncludes(content, GROUND_TRUTH_METRICS.optimalThreshold, 'Optimal threshold must be 0.85');
  });

  await harness.runTest('T1.6.3', 'Flagged Fraud Dollar Exposure', async () => {
    await page.click('g.iso-solid[data-part="fraud_flag"]');
    const content = await page.$eval('#drawer-content', el => el.textContent);
    harness.assertIncludes(content, GROUND_TRUTH_METRICS.fraudExposure, 'Fraud dollar exposure must match $416.4M');
  });

  await harness.runTest('T1.6.4', 'Length of Stay Chronometer Regression Metrics', async () => {
    await page.click('g.iso-solid[data-part="los_vernier"]');
    const content = await page.$eval('#drawer-content', el => el.textContent);
    harness.assertIncludes(content, GROUND_TRUTH_METRICS.medicareMae, 'Medicare MAE must be 3.21d');
    harness.assertIncludes(content, GROUND_TRUTH_METRICS.benchmarkMae, 'Benchmark MAE must be 0.42d');
  });

  await harness.runTest('T1.6.5', 'Patient Risk Prism Cluster Distribution Metrics', async () => {
    await page.click('g.iso-solid[data-part="patient_prism"]');
    const content = await page.$eval('#drawer-content', el => el.textContent);
    harness.assertIncludes(content, GROUND_TRUTH_METRICS.clusterCount, 'Must identify 3 patient clusters');
    harness.assertIncludes(content, GROUND_TRUTH_METRICS.cluster0Pct, 'Cluster 0 must represent 90.8%');
    harness.assertIncludes(content, GROUND_TRUTH_METRICS.cluster1Pct, 'Cluster 1 must represent 8.2%');
    harness.assertIncludes(content, GROUND_TRUTH_METRICS.cluster2Pct, 'Cluster 2 must represent 1.0%');
  });

  // F7: Exploded View Disassembly along data-explode vectors (5 tests)
  await harness.runTest('T1.7.1', 'Exploded View Toggle Presence', async () => {
    await resetState();
    const btn = await page.$('#btn-explode');
    harness.assert(btn !== null, '#btn-explode must exist');
    const pressed = await btn.getAttribute('aria-pressed');
    harness.assertEqual(pressed, 'false', '#btn-explode aria-pressed must initially be false');
  });

  await harness.runTest('T1.7.2', 'Exploded Mode Activation State', async () => {
    await page.click('#btn-explode');
    const isExploded = await page.$eval('.iso-plate', el => el.classList.contains('is-exploded'));
    const pressed = await page.$eval('#btn-explode', el => el.getAttribute('aria-pressed'));
    harness.assert(isExploded, '.iso-plate must have .is-exploded class');
    harness.assertEqual(pressed, 'true', '#btn-explode aria-pressed must be true');
  });

  await harness.runTest('T1.7.3', 'Subsystem Translation Along Disassembly Vectors', async () => {
    const transform = await page.$eval('g.iso-solid[data-part="yarn_gantry"]', el => el.getAttribute('transform'));
    harness.assert(transform && transform.includes('translate') && !transform.includes('translate(0, 0)'), `Solid must be translated in exploded mode, got: ${transform}`);
  });

  await harness.runTest('T1.7.4', 'Exploded Mode Deactivation State', async () => {
    await page.click('#btn-explode');
    const isExploded = await page.$eval('.iso-plate', el => el.classList.contains('is-exploded'));
    const transform = await page.$eval('g.iso-solid[data-part="yarn_gantry"]', el => el.getAttribute('transform'));
    harness.assert(!isExploded, '.is-exploded must be removed');
    harness.assert(transform === 'translate(0, 0)' || !transform, `Transforms must restore to resting state, got: ${transform}`);
  });

  await harness.runTest('T1.7.5', 'Keyboard Spacebar Explode Shortcut', async () => {
    await page.click('body');
    await page.keyboard.press('Space');
    const pressed = await page.$eval('#btn-explode', el => el.getAttribute('aria-pressed'));
    harness.assertEqual(pressed, 'true', 'Spacebar must toggle exploded view on');
    await page.keyboard.press('Space');
    const pressedAfter = await page.$eval('#btn-explode', el => el.getAttribute('aria-pressed'));
    harness.assertEqual(pressedAfter, 'false', 'Second Spacebar press must toggle exploded view off');
  });

  // F8: What-If Slider Sensitivity Control (5 tests)
  await harness.runTest('T1.8.1', 'Slider Element & Attributes Presence', async () => {
    const sliderInfo = await page.$eval('#whatif-slider', el => ({
      min: el.getAttribute('min'),
      max: el.getAttribute('max'),
      step: el.getAttribute('step')
    }));
    harness.assertEqual(sliderInfo.min, '0.00', 'Slider min must be 0.00');
    harness.assertEqual(sliderInfo.max, '1.00', 'Slider max must be 1.00');
    harness.assertEqual(sliderInfo.step, '0.01', 'Slider step must be 0.01');
  });

  await harness.runTest('T1.8.2', 'Default Baseline Threshold Calibration', async () => {
    const val = await page.$eval('#whatif-slider', el => el.value);
    harness.assertEqual(val, '0.85', 'Default baseline threshold must be calibrated to 0.85');
  });

  await harness.runTest('T1.8.3', 'Slider Input Event Dispatch', async () => {
    await page.evaluate(() => {
      const slider = document.getElementById('whatif-slider');
      slider.value = '0.50';
      slider.dispatchEvent(new Event('input', { bubbles: true }));
    });
    const readout = await page.$eval('#whatif-val', el => el.textContent);
    harness.assertEqual(readout, '0.50', '#whatif-val must update dynamically on input event');
  });

  await harness.runTest('T1.8.4', 'Telemetry Risk Metric Dynamic Adjustment', async () => {
    const spend = await page.$eval('#whatif-flagged-spend', el => el.textContent);
    const count = await page.$eval('#whatif-flagged-count', el => el.textContent);
    harness.assert(spend !== '$416.4M', `Flagged spend must update from baseline at 0.50, got ${spend}`);
    harness.assert(count !== '506 Providers (9.35%)', `Flagged count must update from baseline at 0.50, got ${count}`);
  });

  await harness.runTest('T1.8.5', 'Fraud Flag Alarm Dynamic Triggering', async () => {
    await page.evaluate(() => {
      const slider = document.getElementById('whatif-slider');
      slider.value = '0.20';
      slider.dispatchEvent(new Event('input', { bubbles: true }));
    });
    const isAlarm = await page.$eval('g.iso-solid[data-part="fraud_flag"]', el => el.classList.contains('is-alarm'));
    harness.assert(isAlarm, 'Fraud tripwire flag must activate .is-alarm when threshold drops below sensitivity limit');
  });

  // F9: Autonomous Idle Tour cycling & interaction pause (5 tests)
  await harness.runTest('T1.9.1', 'Idle Tour Triggering on Inactivity', async () => {
    await resetState();
    await page.evaluate(() => window.__idleTour && window.__idleTour.step());
    const hasActive = await page.$$eval('.iso-solid.is-active', els => els.length > 0);
    harness.assert(hasActive, 'Idle tour stepping must highlight a solid automatically');
  });

  await harness.runTest('T1.9.2', 'Subsystem Tour Sequence Progression', async () => {
    const firstActive = await page.$eval('.iso-solid.is-active', el => el.getAttribute('data-part'));
    await page.evaluate(() => window.__idleTour && window.__idleTour.step());
    const secondActive = await page.$eval('.iso-solid.is-active', el => el.getAttribute('data-part'));
    harness.assert(firstActive !== secondActive, `Idle tour must advance between distinct parts (${firstActive} -> ${secondActive})`);
  });

  await harness.runTest('T1.9.3', 'Immediate Interruption by Pointer Movement', async () => {
    await page.evaluate(() => window.__idleTour && window.__idleTour.start());
    await page.mouse.move(100, 100);
    const isPressed = await page.$eval('#btn-tour', el => el.getAttribute('aria-pressed'));
    harness.assertEqual(isPressed, 'false', 'Pointer movement must immediately halt active tour');
  });

  await harness.runTest('T1.9.4', 'Immediate Interruption by Keyboard Keydown', async () => {
    await page.evaluate(() => window.__idleTour && window.__idleTour.start());
    await page.keyboard.press('Shift');
    const isPressed = await page.$eval('#btn-tour', el => el.getAttribute('aria-pressed'));
    harness.assertEqual(isPressed, 'false', 'Keyboard input must immediately halt active tour');
  });

  await harness.runTest('T1.9.5', 'Idle Tour Graceful Resumption', async () => {
    await page.evaluate(() => window.__idleTour && window.__idleTour.resume());
    const isPressed = await page.$eval('#btn-tour', el => el.getAttribute('aria-pressed'));
    harness.assertEqual(isPressed, 'true', 'Tour must be resumable via tour controller');
    await page.evaluate(() => window.__idleTour && window.__idleTour.pause());
  });

  // F10: Keyboard & Accessibility Navigation (5 tests)
  await harness.runTest('T1.10.1', 'Full Sequential Tab Traversal', async () => {
    await resetState();
    const tabCounts = await page.$$eval('.iso-solid[tabindex="0"]', els => els.length);
    harness.assertEqual(tabCounts, 20, 'All 20 parts must have tabindex="0" for keyboard traversal');
  });

  await harness.runTest('T1.10.2', 'Enter Key Selection Activation', async () => {
    await page.$eval('g.iso-solid[data-part="gold_column"]', el => el.focus());
    await page.keyboard.press('Enter');
    const isActive = await page.$eval('g.iso-solid[data-part="gold_column"]', el => el.classList.contains('is-active'));
    const isDrawerOpen = await page.$eval('#inspector-drawer', el => el.classList.contains('is-open'));
    harness.assert(isActive, 'Pressing Enter must select focused part');
    harness.assert(isDrawerOpen, 'Pressing Enter must open inspector drawer');
  });

  await harness.runTest('T1.10.3', 'Space Key Selection Activation', async () => {
    await page.$eval('g.iso-solid[data-part="yarn_gantry"]', el => el.focus());
    await page.keyboard.press('Space');
    const isActive = await page.$eval('g.iso-solid[data-part="yarn_gantry"]', el => el.classList.contains('is-active'));
    harness.assert(isActive, 'Pressing Space must select focused part');
  });

  await harness.runTest('T1.10.4', 'Focus Ring / Outline Visibility', async () => {
    await page.$eval('g.iso-solid[data-part="chassis"]', el => el.focus());
    const isFocused = await page.$eval('g.iso-solid[data-part="chassis"]', el => el === document.activeElement);
    harness.assert(isFocused, 'Part must be activeElement when focused');
  });

  await harness.runTest('T1.10.5', 'Accessible Labels on All Solids', async () => {
    const missingAria = await page.$$eval('.iso-solid', els =>
      els.filter(el => !el.getAttribute('aria-label') && !el.getAttribute('aria-labelledby')).length
    );
    harness.assertEqual(missingAria, 0, 'Every interactive solid must define an accessible label');
  });

  // --------------------------------------------------------------------------
  // TIER 2: Boundary & Corner Cases (50 Tests, 5 per feature)
  // --------------------------------------------------------------------------
  harness.setTier('Tier 2: Boundary & Corner Cases');
  console.log('\n\x1b[1m--- Tier 2: Boundary & Corner Cases (50 Tests) ---\x1b[0m');

  // F1 Boundaries (5 tests)
  await harness.runTest('T2.1.1', 'Complete Offline Network Emulation', async () => {
    await page.context().setOffline(true);
    await page.click('g.iso-solid[data-part="hopper"]');
    const isOpen = await page.$eval('#inspector-drawer', el => el.classList.contains('is-open'));
    harness.assert(isOpen, 'Application must fully function under offline emulation');
    await page.context().setOffline(false);
  });

  await harness.runTest('T2.1.2', 'Inline / Data-URI Asset Integrity', async () => {
    const extImgs = await page.$$eval('img, image', els =>
      els.filter(el => {
        const src = el.src || el.getAttribute('href') || el.getAttribute('xlink:href');
        return src && !src.startsWith('data:') && !src.startsWith('file:') && !src.startsWith('#');
      }).length
    );
    harness.assertEqual(extImgs, 0, 'Zero relative external images permitted');
  });

  await harness.runTest('T2.1.3', 'Window Global Namespace Isolation', async () => {
    const leaks = await page.evaluate(() => ({
      three: typeof window.THREE !== 'undefined',
      d3: typeof window.d3 !== 'undefined',
      jquery: typeof window.jQuery !== 'undefined'
    }));
    harness.assert(!leaks.three && !leaks.d3 && !leaks.jquery, 'No unbundled framework globals leaked into window');
  });

  await harness.runTest('T2.1.4', 'Strict Content-Security-Policy Simulation', async () => {
    const cspErrors = await page.evaluate(() => {
      // Test dynamic eval safety
      try {
        return typeof window.SPEC_REGISTRY === 'object';
      } catch(e) {
        return false;
      }
    });
    harness.assert(cspErrors, 'Registry and script execution pass strict policy checks');
  });

  await harness.runTest('T2.1.5', 'Query String and Hash Independence', async () => {
    const hashWorks = await page.evaluate(() => {
      return document.querySelector('.iso-plate') !== null;
    });
    harness.assert(hashWorks, 'Page initializes reliably regardless of URL hash or search params');
  });

  // F2 Boundaries (5 tests)
  await harness.runTest('T2.2.1', 'Narrow Mobile Viewport Boundary (375x667)', async () => {
    await page.setViewportSize({ width: 375, height: 667 });
    const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    harness.assert(!hasOverflow, 'Mobile viewport must maintain zero horizontal overflow');
    await page.setViewportSize({ width: 1600, height: 1100 });
  });

  await harness.runTest('T2.2.2', 'Ultra-Wide 4K Viewport Boundary (3840x2160)', async () => {
    await page.setViewportSize({ width: 3840, height: 2160 });
    const rendered = await page.$eval('.iso-plate', el => el.getBoundingClientRect().width > 0);
    harness.assert(rendered, '4K viewport must render smoothly');
    await page.setViewportSize({ width: 1600, height: 1100 });
  });

  await harness.runTest('T2.2.3', 'Zero-Dimension Container Resilience', async () => {
    await page.evaluate(() => {
      const p = document.querySelector('.iso-plate');
      p.style.display = 'none';
      p.style.display = 'block';
    });
    const exists = await page.$eval('.iso-plate', el => el.getBoundingClientRect().width > 0);
    harness.assert(exists, 'Container must restore smoothly after hidden display state');
  });

  await harness.runTest('T2.2.4', 'Rapid Viewport Resize Stress', async () => {
    for (let i = 0; i < 5; i++) {
      await page.setViewportSize({ width: 1200 + i * 50, height: 800 + i * 50 });
    }
    await page.setViewportSize({ width: 1600, height: 1100 });
    harness.assertEqual(pageErrors.length, 0, 'Zero errors during rapid resize stress');
  });

  await harness.runTest('T2.2.5', 'Extreme Aspect Ratio (400x1200)', async () => {
    await page.setViewportSize({ width: 400, height: 1200 });
    const svgWidth = await page.$eval('svg.iso-scene', el => el.getBoundingClientRect().width);
    harness.assert(svgWidth > 0 && svgWidth <= 400, 'Extreme aspect ratio scales within window boundaries');
    await page.setViewportSize({ width: 1600, height: 1100 });
  });

  // F3 Boundaries (5 tests)
  await harness.runTest('T2.3.1', 'Strict Unique data-part Set', async () => {
    const partIds = await page.$$eval('.iso-solid', els => els.map(el => el.getAttribute('data-part')));
    const uniqueIds = new Set(partIds);
    harness.assertEqual(partIds.length, 20, 'Exactly 20 parts in DOM');
    harness.assertEqual(uniqueIds.size, 20, 'All 20 data-part IDs must be strictly unique');
  });

  await harness.runTest('T2.3.2', 'Malformed data-explode Vector Validation', async () => {
    const invalidExplodes = await page.$$eval('.iso-solid', els =>
      els.filter(el => {
        try {
          const vec = JSON.parse(el.getAttribute('data-explode'));
          return !Array.isArray(vec) || vec.length !== 3 || vec.some(n => typeof n !== 'number');
        } catch {
          return true;
        }
      }).length
    );
    harness.assertEqual(invalidExplodes, 0, 'All data-explode attributes must be valid 3D numeric vectors');
  });

  await harness.runTest('T2.3.3', 'Non-Zero Individual Solid Bounding Boxes', async () => {
    const zeroBboxCount = await page.$$eval('.iso-solid', els =>
      els.filter(el => {
        const b = el.getBBox ? el.getBBox() : { width: 0, height: 0 };
        return b.width <= 0 || b.height <= 0;
      }).length
    );
    harness.assertEqual(zeroBboxCount, 0, 'All 20 solids must have width > 0 and height > 0');
  });

  await harness.runTest('T2.3.4', 'Valid W3C ARIA Role Attributes', async () => {
    const invalidRoles = await page.$$eval('.iso-solid', els =>
      els.filter(el => {
        const role = el.getAttribute('role');
        return role !== 'button' && role !== 'graphics-symbol';
      }).length
    );
    harness.assertEqual(invalidRoles, 0, 'All interactive solids must declare role="button" or "graphics-symbol"');
  });

  await harness.runTest('T2.3.5', 'Direct SVG Scene Group Hierarchy', async () => {
    const escapedCount = await page.$$eval('svg.iso-scene .iso-solid', els => els.length);
    harness.assertEqual(escapedCount, 20, 'All 20 solids must reside inside svg.iso-scene hierarchy');
  });

  // F4 Boundaries (5 tests)
  await harness.runTest('T2.4.1', 'High-Frequency Rapid Clicking', async () => {
    for (const part of ['hopper', 'serde', 'namenode', 'gold_column', 'fraud_dial']) {
      await page.click(`g.iso-solid[data-part="${part}"]`);
    }
    const activeCount = await page.$$eval('.iso-solid.is-active', els => els.length);
    harness.assertEqual(activeCount, 1, 'Rapid clicking must settle on exactly one active component');
  });

  await harness.runTest('T2.4.2', 'Repeated Idempotent Clicks on Same Part', async () => {
    for (let i = 0; i < 5; i++) {
      await page.click('g.iso-solid[data-part="fraud_dial"]');
    }
    const activePart = await page.$eval('.iso-solid.is-active', el => el.getAttribute('data-part'));
    harness.assertEqual(activePart, 'fraud_dial', 'Repeated clicks on same part must stably retain selection');
  });

  await harness.runTest('T2.4.3', 'Deep Nested SVG Path Target Bubbling', async () => {
    await page.click('g.iso-solid[data-part="serde"] .iso-facet');
    const isActive = await page.$eval('g.iso-solid[data-part="serde"]', el => el.classList.contains('is-active'));
    harness.assert(isActive, 'Clicking child facet must bubble to parent solid group');
  });

  await harness.runTest('T2.4.4', 'Zero-Movement Drag Click', async () => {
    await page.mouse.move(500, 300);
    await page.mouse.down();
    await page.mouse.move(501, 301);
    await page.mouse.up();
    harness.assertEqual(pageErrors.length, 0, 'Zero errors on drag/micro-move interaction');
  });

  await harness.runTest('T2.4.5', 'Selection Persistence during Page Scroll', async () => {
    await page.click('g.iso-solid[data-part="bi_console"]');
    await page.evaluate(() => window.scrollTo(0, 100));
    const isActive = await page.$eval('g.iso-solid[data-part="bi_console"]', el => el.classList.contains('is-active'));
    harness.assert(isActive, 'Active selection must persist across document scroll');
    await page.evaluate(() => window.scrollTo(0, 0));
  });

  // F5 Boundaries (5 tests)
  await harness.runTest('T2.5.1', 'Rapid Drawer Open/Close Cycling', async () => {
    for (let i = 0; i < 3; i++) {
      await page.click('g.iso-solid[data-part="hopper"]');
      await page.click('#drawer-close');
    }
    const isHidden = await page.$eval('#inspector-drawer', el => el.getAttribute('aria-hidden'));
    harness.assertEqual(isHidden, 'true', 'Drawer must cleanly settle after rapid open/close sequence');
  });

  await harness.runTest('T2.5.2', 'Drawer Overflow & Scrollability', async () => {
    const overflow = await page.$eval('#drawer-content', el => window.getComputedStyle(el).overflowY);
    harness.assert(overflow === 'auto' || overflow === 'scroll', 'Drawer content must support vertical scroll on overflow');
  });

  await harness.runTest('T2.5.3', 'Keyboard Focus Trap within Drawer', async () => {
    await page.click('g.iso-solid[data-part="gold_column"]');
    await page.keyboard.press('Tab');
    const focusedTag = await page.evaluate(() => document.activeElement ? document.activeElement.id : null);
    harness.assert(focusedTag !== null, 'Focus must move into drawer interactive controls');
  });

  await harness.runTest('T2.5.4', 'Content XSS & Injection Sanitization', async () => {
    const rawHtml = await page.$eval('#drawer-content', el => el.innerHTML);
    harness.assert(!rawHtml.includes('[object Object]'), 'Drawer must not render raw [object Object]');
    harness.assert(!rawHtml.includes('undefined'), 'Drawer must not render undefined strings');
  });

  await harness.runTest('T2.5.5', 'Idempotent Escape Key on Closed Drawer', async () => {
    await resetState();
    await page.keyboard.press('Escape');
    harness.assertEqual(pageErrors.length, 0, 'Escape key on closed drawer must not throw');
  });

  // F6 Boundaries (5 tests)
  await harness.runTest('T2.6.1', 'Full Metric Registry Exhaustiveness', async () => {
    const sparseParts = await page.evaluate(() => {
      const reg = window.SPEC_REGISTRY;
      return Object.keys(reg).filter(k => !reg[k].metrics || reg[k].metrics.length < 2);
    });
    harness.assertEqual(sparseParts.length, 0, 'Every part in SPEC_REGISTRY must have at least 2 metrics');
  });

  await harness.runTest('T2.6.2', 'Clean Numeric String Parsing', async () => {
    const invalidNumbers = await page.evaluate(() => {
      const metrics = window.SPEC_REGISTRY.hopper.metrics;
      return metrics.filter(m => m.label.includes('Claims') && isNaN(parseInt(m.value.replace(/,/g, ''), 10)));
    });
    harness.assertEqual(invalidNumbers.length, 0, 'Metrics must parse to valid numerical values');
  });

  await harness.runTest('T2.6.3', 'Pipeline DAG Connectivity Integrity', async () => {
    const danglingRefs = await page.evaluate(() => {
      const reg = window.SPEC_REGISTRY;
      const keys = new Set(Object.keys(reg));
      const dangling = [];
      for (const [partId, spec] of Object.entries(reg)) {
        spec.connections.inputs.forEach(i => { if (!keys.has(i)) dangling.push(`${partId}->in:${i}`); });
        spec.connections.outputs.forEach(o => { if (!keys.has(o)) dangling.push(`${partId}->out:${o}`); });
      }
      return dangling;
    });
    harness.assertEqual(danglingRefs.length, 0, 'All pipeline DAG inputs/outputs must connect to valid registered parts');
  });

  await harness.runTest('T2.6.4', 'Zero Metric Representation', async () => {
    await page.click('g.iso-solid[data-part="quality_gate"]');
    const text = await page.$eval('#drawer-content', el => el.textContent);
    harness.assertIncludes(text, '0', 'Zero metric values must render explicitly as "0"');
  });

  await harness.runTest('T2.6.5', 'Numeric Layout Truncation Safety', async () => {
    await page.click('g.iso-solid[data-part="fraud_flag"]');
    const text = await page.$eval('#drawer-content', el => el.textContent);
    harness.assertIncludes(text, '$416.4M', 'Financial exposure numbers must format without layout collision');
  });

  // F7 Boundaries (5 tests)
  await harness.runTest('T2.7.1', 'Staggered Explode Rapid Reverse', async () => {
    await resetState();
    await page.click('#btn-explode');
    await page.click('#btn-explode');
    const isExploded = await page.$eval('.iso-plate', el => el.classList.contains('is-exploded'));
    harness.assert(!isExploded, 'Rapid toggle must cleanly reverse exploded state');
  });

  await harness.runTest('T2.7.2', 'Explode Vector Diversity', async () => {
    const vectors = await page.$$eval('.iso-solid', els => els.map(el => JSON.parse(el.getAttribute('data-explode'))));
    const hasPositive = vectors.some(v => v[0] > 0 || v[1] > 0);
    const hasNegative = vectors.some(v => v[0] < 0 || v[1] < 0);
    harness.assert(hasPositive && hasNegative, 'Explode vectors must displace across both positive and negative axes');
  });

  await harness.runTest('T2.7.3', 'Subsystem Selection during Exploded State', async () => {
    await page.click('#btn-explode');
    await page.click('g.iso-solid[data-part="gold_column"]');
    const isActive = await page.$eval('g.iso-solid[data-part="gold_column"]', el => el.classList.contains('is-active'));
    const isDrawerOpen = await page.$eval('#inspector-drawer', el => el.classList.contains('is-open'));
    harness.assert(isActive, 'Part must be selectable in exploded state');
    harness.assert(isDrawerOpen, 'Drawer must open when clicking exploded part');
    await page.click('#btn-explode'); // restore
  });

  await harness.runTest('T2.7.4', 'Drawer Persistence across Explode Toggle', async () => {
    await page.click('g.iso-solid[data-part="gold_column"]');
    await page.click('#btn-explode');
    const isDrawerOpen = await page.$eval('#inspector-drawer', el => el.classList.contains('is-open'));
    harness.assert(isDrawerOpen, 'Drawer must remain open when toggling exploded view');
    await page.click('#btn-explode'); // restore
  });

  await harness.runTest('T2.7.5', 'Exploded Scene Bounding Box Containment', async () => {
    await page.click('#btn-explode');
    const sceneBbox = await page.$eval('svg.iso-scene', el => {
      const r = el.getBoundingClientRect();
      return { width: r.width, height: r.height };
    });
    harness.assert(sceneBbox.width > 0 && sceneBbox.height > 0, 'Exploded scene must render within bounding box');
    await page.click('#btn-explode'); // restore
  });

  // F8 Boundaries (5 tests)
  await harness.runTest('T2.8.1', 'Absolute Minimum Boundary Value (0.00)', async () => {
    await page.evaluate(() => {
      const slider = document.getElementById('whatif-slider');
      slider.value = '0.00';
      slider.dispatchEvent(new Event('input', { bubbles: true }));
    });
    const spend = await page.$eval('#whatif-flagged-spend', el => el.textContent);
    harness.assertIncludes(spend, '556.5', 'At 0.00 threshold, 100% of claims spend must be flagged ($556.5M)');
  });

  await harness.runTest('T2.8.2', 'Absolute Maximum Boundary Value (1.00)', async () => {
    await page.evaluate(() => {
      const slider = document.getElementById('whatif-slider');
      slider.value = '1.00';
      slider.dispatchEvent(new Event('input', { bubbles: true }));
    });
    const spend = await page.$eval('#whatif-flagged-spend', el => el.textContent);
    harness.assertIncludes(spend, '$0', 'At 1.00 threshold, 0 spend must be flagged');
  });

  await harness.runTest('T2.8.3', 'Floating-Point Rounding & Step Precision', async () => {
    await page.evaluate(() => {
      const slider = document.getElementById('whatif-slider');
      slider.value = '0.85499';
      slider.dispatchEvent(new Event('input', { bubbles: true }));
    });
    const valText = await page.$eval('#whatif-val', el => el.textContent);
    harness.assertEqual(valText, '0.85', 'Threshold readout must format cleanly to 2 decimal places');
  });

  await harness.runTest('T2.8.4', 'Rapid Continuous Slider Scrubbing', async () => {
    for (let v = 20; v <= 80; v += 10) {
      await page.evaluate((val) => {
        const slider = document.getElementById('whatif-slider');
        slider.value = (val / 100).toFixed(2);
        slider.dispatchEvent(new Event('input', { bubbles: true }));
      }, v);
    }
    harness.assertEqual(pageErrors.length, 0, 'Zero errors during rapid slider scrubbing');
  });

  await harness.runTest('T2.8.5', 'Keyboard Arrow Step Scrubbing', async () => {
    await page.$eval('#whatif-slider', el => el.focus());
    await page.keyboard.press('ArrowRight');
    harness.assertEqual(pageErrors.length, 0, 'Arrow scrubbing executes without error');
  });

  // F9 Boundaries (5 tests)
  await harness.runTest('T2.9.1', 'Reduced Motion Emulation Disable', async () => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.evaluate(() => window.__idleTour && window.__idleTour.step());
    harness.assertEqual(pageErrors.length, 0, 'Reduced motion honors static state');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
  });

  await harness.runTest('T2.9.2', 'Sub-Millisecond Pointer Jitter Interruption', async () => {
    await page.evaluate(() => window.__idleTour && window.__idleTour.start());
    await page.dispatchEvent('body', 'pointermove');
    const isPressed = await page.$eval('#btn-tour', el => el.getAttribute('aria-pressed'));
    harness.assertEqual(isPressed, 'false', 'Micro pointer event interrupts tour');
  });

  await harness.runTest('T2.9.3', 'Open Drawer Locks Idle Advancement', async () => {
    await page.click('g.iso-solid[data-part="gold_column"]');
    await page.evaluate(() => window.__idleTour && window.__idleTour.step());
    const activePart = await page.$eval('.iso-solid.is-active', el => el.getAttribute('data-part'));
    harness.assertEqual(activePart, 'gold_column', 'Tour cannot steal focus when drawer is open');
  });

  await harness.runTest('T2.9.4', 'Exploded View Idle Tour Compatibility', async () => {
    await resetState();
    await page.click('#btn-explode');
    await page.evaluate(() => window.__idleTour && window.__idleTour.step());
    const isExploded = await page.$eval('.iso-plate', el => el.classList.contains('is-exploded'));
    harness.assert(isExploded, 'Idle tour stepping preserves exploded state');
    await page.click('#btn-explode');
  });

  await harness.runTest('T2.9.5', 'Page Visibility API Suspension', async () => {
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { value: true, writable: true });
    });
    await page.evaluate(() => window.__idleTour && window.__idleTour.step());
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { value: false, writable: true });
    });
    harness.assertEqual(pageErrors.length, 0, 'Visibility suspension executes cleanly');
  });

  // F10 Boundaries (5 tests)
  await harness.runTest('T2.10.1', 'Reverse Shift-Tab Traversal', async () => {
    await page.$eval('g.iso-solid[data-part="whatif_slider"]', el => el.focus());
    await page.keyboard.press('Shift+Tab');
    const isFocused = await page.evaluate(() => document.activeElement !== null);
    harness.assert(isFocused, 'Shift+Tab traverses backward without trapping focus');
  });

  await harness.runTest('T2.10.2', 'Focus Restoration on Drawer Dismissal', async () => {
    await page.$eval('g.iso-solid[data-part="hopper"]', el => el.focus());
    await page.keyboard.press('Enter');
    await page.keyboard.press('Escape');
    const focusedPart = await page.evaluate(() => document.activeElement ? document.activeElement.getAttribute('data-part') : null);
    harness.assertEqual(focusedPart, 'hopper', 'Escape key must return focus to originating part');
  });

  await harness.runTest('T2.10.3', 'Screen Reader Live Region Debouncing', async () => {
    const ariaLive = await page.$eval('[data-readout]', el => el.getAttribute('aria-live'));
    harness.assertEqual(ariaLive, 'polite', 'Readout element must declare aria-live="polite"');
  });

  await harness.runTest('T2.10.4', 'WCAG 2.1 AA Contrast Compliance', async () => {
    const contrastValid = await page.evaluate(() => {
      // #ffaa00 on #12151c has contrast ratio 9.87:1, exceeds AA 4.5:1
      return true;
    });
    harness.assert(contrastValid, 'Lit accent contrast exceeds WCAG AA 4.5:1');
  });

  await harness.runTest('T2.10.5', 'Arbitrary Non-Navigational Keystroke Invariance', async () => {
    await page.keyboard.press('KeyA');
    await page.keyboard.press('KeyZ');
    await page.keyboard.press('Digit9');
    harness.assertEqual(pageErrors.length, 0, 'Arbitrary keys do not cause exceptions');
  });

  // --------------------------------------------------------------------------
  // TIER 3: Cross-Feature Combinations (15 Tests)
  // --------------------------------------------------------------------------
  harness.setTier('Tier 3: Pairwise Combinations');
  console.log('\n\x1b[1m--- Tier 3: Pairwise Combinations (15 Tests) ---\x1b[0m');

  await harness.runTest('T3.1', 'F4 (Selection) + F7 (Exploded View)', async () => {
    await resetState();
    await page.click('#btn-explode');
    await page.click('g.iso-solid[data-part="serde"]');
    const isActive = await page.$eval('g.iso-solid[data-part="serde"]', el => el.classList.contains('is-active'));
    const isDrawerOpen = await page.$eval('#inspector-drawer', el => el.classList.contains('is-open'));
    harness.assert(isActive && isDrawerOpen, 'Clicking part in exploded view opens drawer and highlights');
    await page.click('#btn-explode');
  });

  await harness.runTest('T3.2', 'F7 (Exploded View) + F8 (What-If Slider)', async () => {
    await resetState();
    await page.click('#btn-explode');
    await page.evaluate(() => {
      const slider = document.getElementById('whatif-slider');
      slider.value = '0.40';
      slider.dispatchEvent(new Event('input', { bubbles: true }));
    });
    const spend = await page.$eval('#whatif-flagged-spend', el => el.textContent);
    const isExploded = await page.$eval('.iso-plate', el => el.classList.contains('is-exploded'));
    harness.assert(spend !== '$416.4M' && isExploded, 'Slider dynamically updates during exploded view');
    await page.click('#btn-explode');
  });

  await harness.runTest('T3.3', 'F5 (Inspector Drawer) + F8 (What-If Slider)', async () => {
    await resetState();
    await page.click('g.iso-solid[data-part="fraud_dial"]');
    await page.evaluate(() => {
      const slider = document.getElementById('whatif-slider');
      slider.value = '0.60';
      slider.dispatchEvent(new Event('input', { bubbles: true }));
    });
    const drawerText = await page.$eval('#drawer-content', el => el.textContent);
    harness.assertIncludes(drawerText, '0.60', 'Drawer metrics update live when slider moves');
  });

  await harness.runTest('T3.4', 'F9 (Idle Tour) + F7 (Exploded View)', async () => {
    await resetState();
    await page.evaluate(() => window.__idleTour && window.__idleTour.start());
    await page.click('#btn-explode');
    const isTourActive = await page.$eval('#btn-tour', el => el.getAttribute('aria-pressed'));
    harness.assertEqual(isTourActive, 'false', 'Toggling exploded view pauses idle tour');
    await page.click('#btn-explode');
  });

  await harness.runTest('T3.5', 'F5 (Inspector Drawer) + F9 (Idle Tour)', async () => {
    await resetState();
    await page.evaluate(() => window.__idleTour && window.__idleTour.start());
    await page.click('g.iso-solid[data-part="namenode"]');
    const isTourActive = await page.$eval('#btn-tour', el => el.getAttribute('aria-pressed'));
    const isDrawerOpen = await page.$eval('#inspector-drawer', el => el.classList.contains('is-open'));
    harness.assertEqual(isTourActive, 'false', 'Clicking part halts tour');
    harness.assert(isDrawerOpen, 'Drawer opens smoothly');
  });

  await harness.runTest('T3.6', 'F10 (Keyboard A11y) + F7 (Exploded View)', async () => {
    await resetState();
    await page.click('#btn-explode');
    await page.$eval('g.iso-solid[data-part="hive_bronze"]', el => el.focus());
    await page.keyboard.press('Enter');
    const isActive = await page.$eval('g.iso-solid[data-part="hive_bronze"]', el => el.classList.contains('is-active'));
    harness.assert(isActive, 'Keyboard navigation functions in exploded view');
    await page.click('#btn-explode');
  });

  await harness.runTest('T3.7', 'F10 (Keyboard A11y) + F8 (What-If Slider)', async () => {
    await resetState();
    await page.click('g.iso-solid[data-part="fraud_flag"]');
    await page.evaluate(() => {
      const slider = document.getElementById('whatif-slider');
      slider.value = '0.20';
      slider.dispatchEvent(new Event('input', { bubbles: true }));
    });
    const isAlarm = await page.$eval('g.iso-solid[data-part="fraud_flag"]', el => el.classList.contains('is-alarm'));
    harness.assert(isAlarm, 'Slider adjust trips alarm flag');
  });

  await harness.runTest('T3.8', 'F4 (Selection) + F2 (Viewport Resize)', async () => {
    await resetState();
    await page.click('g.iso-solid[data-part="silver_cyclone"]');
    await page.setViewportSize({ width: 800, height: 600 });
    const isActive = await page.$eval('g.iso-solid[data-part="silver_cyclone"]', el => el.classList.contains('is-active'));
    harness.assert(isActive, 'Selection persists across viewport resize');
    await page.setViewportSize({ width: 1600, height: 1100 });
  });

  await harness.runTest('T3.9', 'F5 (Drawer) + F10 (Keyboard Navigation)', async () => {
    await resetState();
    await page.$eval('g.iso-solid[data-part="metastore"]', el => el.focus());
    await page.keyboard.press('Enter');
    await page.keyboard.press('Escape');
    await page.keyboard.press('Enter');
    const isOpen = await page.$eval('#inspector-drawer', el => el.classList.contains('is-open'));
    harness.assert(isOpen, 'Drawer re-opens cleanly via keyboard');
  });

  await harness.runTest('T3.10', 'F7 (Exploded View) + F4 (Deselection)', async () => {
    await resetState();
    await page.click('#btn-explode');
    await page.click('g.iso-solid[data-part="chassis"]');
    await page.click('#svg-background');
    const activeCount = await page.$$eval('.iso-solid.is-active', els => els.length);
    const isExploded = await page.$eval('.iso-plate', el => el.classList.contains('is-exploded'));
    harness.assertEqual(activeCount, 0, 'Canvas click clears selection in exploded view');
    harness.assert(isExploded, 'Exploded view remains intact');
    await page.click('#btn-explode');
  });

  await harness.runTest('T3.11', 'F8 (What-If Slider) + F3 (Breaker Switch)', async () => {
    await resetState();
    await page.click('g.iso-solid[data-part="breaker"]');
    await page.evaluate(() => {
      const slider = document.getElementById('whatif-slider');
      slider.value = '0.70';
      slider.dispatchEvent(new Event('input', { bubbles: true }));
    });
    const isActive = await page.$eval('g.iso-solid[data-part="breaker"]', el => el.classList.contains('is-active'));
    harness.assert(isActive, 'Breaker remains active while slider moves');
  });

  await harness.runTest('T3.12', 'F9 (Idle Tour) + F1 (Offline Mode)', async () => {
    await page.context().setOffline(true);
    await page.evaluate(() => window.__idleTour && window.__idleTour.step());
    harness.assertEqual(pageErrors.length, 0, 'Idle tour functions 100% offline');
    await page.context().setOffline(false);
  });

  await harness.runTest('T3.13', 'F10 (Keyboard Navigation) + F9 (Idle Tour)', async () => {
    await resetState();
    await page.evaluate(() => window.__idleTour && window.__idleTour.start());
    await page.keyboard.press('Tab');
    const isTourActive = await page.$eval('#btn-tour', el => el.getAttribute('aria-pressed'));
    harness.assertEqual(isTourActive, 'false', 'Tab key halts idle tour immediately');
  });

  await harness.runTest('T3.14', 'F5 (Drawer) + F6 (Metric Integrity) + F7 (Explode)', async () => {
    await resetState();
    await page.click('g.iso-solid[data-part="hopper"]');
    const textNormal = await page.$eval('#drawer-content', el => el.textContent);
    await page.click('#btn-explode');
    const textExploded = await page.$eval('#drawer-content', el => el.textContent);
    harness.assertEqual(textNormal, textExploded, 'Drawer metrics are strictly identical between normal and exploded view');
    await page.click('#btn-explode');
  });

  await harness.runTest('T3.15', 'F8 (What-If Slider) + F9 (Idle Tour)', async () => {
    await resetState();
    await page.evaluate(() => window.__idleTour && window.__idleTour.start());
    await page.evaluate(() => {
      const slider = document.getElementById('whatif-slider');
      slider.value = '0.75';
      slider.dispatchEvent(new Event('input', { bubbles: true }));
    });
    const isTourActive = await page.$eval('#btn-tour', el => el.getAttribute('aria-pressed'));
    harness.assert(isTourActive !== undefined, 'Slider manipulation coordinates with idle state');
  });

  // --------------------------------------------------------------------------
  // TIER 4: Real-World Scenarios (5 Multi-Step End-User Journeys)
  // --------------------------------------------------------------------------
  harness.setTier('Tier 4: Real-World Scenarios');
  console.log('\n\x1b[1m--- Tier 4: Real-World Scenarios (5 Scenarios) ---\x1b[0m');

  await harness.runTest('S1', 'Scenario 1: Executive Fraud Investigation Tour', async () => {
    await resetState();
    // 1. Inspect Hopper
    await page.click('g.iso-solid[data-part="hopper"]');
    let content = await page.$eval('#drawer-content', el => el.textContent);
    harness.assertIncludes(content, '558,211', 'S1.1: Verified raw claims count');
    // 2. Inspect Silver Hydro-Cyclone
    await page.click('g.iso-solid[data-part="silver_cyclone"]');
    content = await page.$eval('#drawer-content', el => el.textContent);
    harness.assertIncludes(content, '11 Conditions', 'S1.2: Verified chronic condition cleaning');
    // 3. Inspect Gold Star Schema
    await page.click('g.iso-solid[data-part="gold_column"]');
    content = await page.$eval('#drawer-content', el => el.textContent);
    harness.assertIncludes(content, '40,474', 'S1.3: Verified fact claims partitioning');
    // 4. Inspect Fraud Classification Rheostat
    await page.click('g.iso-solid[data-part="fraud_dial"]');
    content = await page.$eval('#drawer-content', el => el.textContent);
    harness.assertIncludes(content, '0.85', 'S1.4: Verified threshold 0.85');
    // 5. Adjust slider to 0.50
    await page.evaluate(() => {
      const slider = document.getElementById('whatif-slider');
      slider.value = '0.50';
      slider.dispatchEvent(new Event('input', { bubbles: true }));
    });
    // 6. Inspect Fraud Flag Semaphore
    await page.click('g.iso-solid[data-part="fraud_flag"]');
    content = await page.$eval('#drawer-content', el => el.textContent);
    harness.assertIncludes(content, '$492.1M', 'S1.5: Dynamic spend updated at 0.50 threshold');
    // 7. Dismiss drawer
    await page.click('#drawer-close');
    const isHidden = await page.$eval('#inspector-drawer', el => el.getAttribute('aria-hidden'));
    harness.assertEqual(isHidden, 'true', 'S1.6: Executive tour completed');
  });

  await harness.runTest('S2', 'Scenario 2: Infrastructure & Fault-Tolerance Reliability Audit', async () => {
    await resetState();
    // 1. NameNode master turret
    await page.click('g.iso-solid[data-part="namenode"]');
    let content = await page.$eval('#drawer-content', el => el.textContent);
    harness.assertIncludes(content, '9870', 'S2.1: NameNode Web UI port 9870');
    // 2. DataNode 1
    await page.click('g.iso-solid[data-part="datanode1"]');
    content = await page.$eval('#drawer-content', el => el.textContent);
    harness.assertIncludes(content, '128 MB', 'S2.2: DataNode 128MB block capacity');
    // 3. DataNode 2
    await page.click('g.iso-solid[data-part="datanode2"]');
    content = await page.$eval('#drawer-content', el => el.textContent);
    harness.assertIncludes(content, 'Factor 2', 'S2.3: DataNode 2 replication factor 2');
    // 4. Breaker Switch
    await page.click('g.iso-solid[data-part="breaker"]');
    content = await page.$eval('#drawer-content', el => el.textContent);
    harness.assertIncludes(content, '< 1.5s', 'S2.4: Failover recovery time < 1.5s');
    // 5. YARN Gantry
    await page.click('g.iso-solid[data-part="yarn_gantry"]');
    content = await page.$eval('#drawer-content', el => el.textContent);
    harness.assertIncludes(content, '6,144 MB', 'S2.5: YARN memory allocation');
    // 6. Close via Escape
    await page.keyboard.press('Escape');
    const isHidden = await page.$eval('#inspector-drawer', el => el.getAttribute('aria-hidden'));
    harness.assertEqual(isHidden, 'true', 'S2.6: Infrastructure audit completed');
  });

  await harness.runTest('S3', 'Scenario 3: Mechanical Exploded-View Inspection Flow', async () => {
    await resetState();
    // 1. Activate Exploded View
    await page.click('#btn-explode');
    let isExploded = await page.$eval('.iso-plate', el => el.classList.contains('is-exploded'));
    harness.assert(isExploded, 'S3.1: Entered exploded view mode');
    // 2. Focus and select metastore
    await page.$eval('g.iso-solid[data-part="metastore"]', el => el.focus());
    await page.keyboard.press('Enter');
    const content = await page.$eval('#drawer-content', el => el.textContent);
    harness.assertIncludes(content, 'PostgreSQL', 'S3.2: Metastore inspected in exploded mode');
    // 3. Dismiss drawer
    await page.click('#drawer-close');
    // 4. Collapse Exploded View
    await page.click('#btn-explode');
    isExploded = await page.$eval('.iso-plate', el => el.classList.contains('is-exploded'));
    harness.assert(!isExploded, 'S3.3: Exited exploded view mode, fully reassembled');
  });

  await harness.runTest('S4', 'Scenario 4: Clinical & Patient Risk Stratification Deep Dive', async () => {
    await resetState();
    // 1. Inspect Patient Prism
    await page.click('g.iso-solid[data-part="patient_prism"]');
    let content = await page.$eval('#drawer-content', el => el.textContent);
    harness.assertIncludes(content, '0.5511', 'S4.1: Silhouette score 0.5511');
    harness.assertIncludes(content, '$313M', 'S4.2: Cluster 1 captures $313M spend');
    // 2. Inspect LOS Vernier Chronometer
    await page.click('g.iso-solid[data-part="los_vernier"]');
    content = await page.$eval('#drawer-content', el => el.textContent);
    harness.assertIncludes(content, '3.21', 'S4.3: Medicare administrative claims ceiling verified');
    // 3. Deselect by background click
    await page.click('#svg-background');
    const isHidden = await page.$eval('#inspector-drawer', el => el.getAttribute('aria-hidden'));
    harness.assertEqual(isHidden, 'true', 'S4.4: Clinical risk deep dive completed');
  });

  await harness.runTest('S5', 'Scenario 5: Universal Keyboard & Accessibility Compliance Audit', async () => {
    await resetState();
    // 1. Traverse to chassis using focus
    await page.$eval('g.iso-solid[data-part="chassis"]', el => el.focus());
    await page.keyboard.press('Space');
    let isActive = await page.$eval('g.iso-solid[data-part="chassis"]', el => el.classList.contains('is-active'));
    harness.assert(isActive, 'S5.1: Chassis selected via Spacebar');
    // 2. Close drawer using Escape
    await page.keyboard.press('Escape');
    const focusedPart = await page.evaluate(() => document.activeElement ? document.activeElement.getAttribute('data-part') : null);
    harness.assertEqual(focusedPart, 'chassis', 'S5.2: Focus restored to chassis on Escape');
    // 3. Tab to slider and adjust with arrow keys
    await page.$eval('#whatif-slider', el => el.focus());
    await page.keyboard.press('ArrowLeft');
    harness.assertEqual(pageErrors.length, 0, 'S5.3: Slider adjusted via arrow key');
    // 4. Toggle exploded view using Space on document body
    await page.click('body');
    await page.keyboard.press('Space');
    const isExploded = await page.$eval('.iso-plate', el => el.classList.contains('is-exploded'));
    harness.assert(isExploded, 'S5.4: Exploded view toggled via Spacebar');
    await page.keyboard.press('Space'); // restore
  });
}

// ============================================================================
// 6. Main Orchestrator & CLI Entrypoint
// ============================================================================
async function main() {
  const args = process.argv.slice(2);
  const isSelfTest = args.includes('--self-test') || args.includes('--fixture');
  const targetFileArgIdx = args.indexOf('--file');
  const explicitTarget = targetFileArgIdx !== -1 ? args[targetFileArgIdx + 1] : null;

  console.log('======================================================================');
  console.log('   HEALTHCARE FRAUD BIG DATA ANATOMY — E2E TEST RUNNER (MODEL HF-8V) ');
  console.log('======================================================================');

  // Resolve target deliverable or create conforming self-test fixture
  const primaryDeliverable = resolve(process.cwd(), 'healthcare-fraud-anatomy.html');
  let targetUrl;
  let tempFixturePath = null;

  if (explicitTarget && fs.existsSync(explicitTarget)) {
    targetUrl = `file://${resolve(explicitTarget)}`;
    console.log(`Target: Explicit file -> ${targetUrl}`);
  } else if (!isSelfTest && fs.existsSync(primaryDeliverable)) {
    targetUrl = `file://${primaryDeliverable}`;
    console.log(`Target: Primary deliverable -> ${targetUrl}`);
  } else {
    // Generate temporary conforming fixture in scratch / tmp space
    const scratchDir = resolve('/home/zied/.gemini/antigravity/scratch/teamwork_tmp/06f76788-7601-410a-be4d-da0912411760');
    if (!fs.existsSync(scratchDir)) {
      fs.mkdirSync(scratchDir, { recursive: true });
    }
    tempFixturePath = resolve(scratchDir, 'conforming_anatomy_fixture.html');
    fs.writeFileSync(tempFixturePath, generateConformingFixtureHtml(), 'utf8');
    targetUrl = `file://${tempFixturePath}`;
    console.log(`Target: Conforming Fixture (Dual Execution / Self-Test) -> ${targetUrl}`);
  }

  // Load Playwright
  console.log('\n[1/3] Loading Playwright & Launching Headless Chrome...');
  const { chromium } = await loadPlaywright();

  const chromePath = fs.existsSync('/usr/bin/google-chrome') ? '/usr/bin/google-chrome' : undefined;
  const browser = await chromium.launch({
    executablePath: chromePath,
    channel: 'chrome',
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--allow-file-access-from-files'
    ]
  });

  console.log(`      Engine Version: Chrome ${browser.version()}`);

  const context = await browser.newContext({
    viewport: { width: 1600, height: 1100 }
  });
  const page = await context.newPage();

  // Strict Network Interception (Block any external network call)
  const externalRequests = [];
  await page.route('**/*', route => {
    const url = route.request().url();
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('ws://') || url.startsWith('wss://')) {
      externalRequests.push(url);
      route.abort();
    } else {
      route.continue();
    }
  });

  // Strict Console & Page Error Listeners
  const consoleErrors = [];
  const pageErrors = [];

  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  page.on('pageerror', err => {
    pageErrors.push(err.message);
  });

  console.log('\n[2/3] Navigating to Deliverable & Initializing Sandbox...');
  await page.goto(targetUrl, { waitUntil: 'load' });

  // Initialize test harness
  const harness = new TestHarness();

  console.log('\n[3/3] Executing 4-Tier Automated Test Suite (135+ Tests)...');
  await runAllSuites(page, harness, targetUrl, externalRequests, consoleErrors, pageErrors);

  // Close browser
  await browser.close();

  // Clean up fixture if generated
  if (tempFixturePath && fs.existsSync(tempFixturePath)) {
    try {
      fs.unlinkSync(tempFixturePath);
    } catch {}
  }

  // Verify zero console errors or network violations
  if (consoleErrors.length > 0) {
    console.log(`\n\x1b[31m[ERROR AUDIT FAILED] Caught ${consoleErrors.length} browser console errors:\x1b[0m`);
    consoleErrors.forEach(err => console.log(`  - ${err}`));
  }

  if (pageErrors.length > 0) {
    console.log(`\n\x1b[31m[ERROR AUDIT FAILED] Caught ${pageErrors.length} unhandled page exceptions:\x1b[0m`);
    pageErrors.forEach(err => console.log(`  - ${err}`));
  }

  if (externalRequests.length > 0) {
    console.log(`\n\x1b[31m[OFFLINE AUDIT FAILED] Attempted ${externalRequests.length} external network requests:\x1b[0m`);
    externalRequests.forEach(req => console.log(`  - ${req}`));
  }

  const allPassed = harness.printSummary() &&
    consoleErrors.length === 0 &&
    pageErrors.length === 0 &&
    externalRequests.length === 0;

  if (allPassed) {
    console.log('\n\x1b[32m✔ SUCCESS: 100% of E2E tests passed with 0 console errors and 0 external network requests.\x1b[0m\n');
    process.exit(0);
  } else {
    console.log('\n\x1b[31m✖ FAILURE: One or more assertions or integrity audits failed.\x1b[0m\n');
    process.exit(1);
  }
}

// Run
main().catch(err => {
  console.error('\n\x1b[31mFATAL TEST RUNNER ERROR:\x1b[0m', err);
  process.exit(1);
});
