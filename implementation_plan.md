# Implementation Plan - Version 1 (MVP) Personalized DSA Learning & Concept Diagnosis Platform

Build a personalized DSA learning platform powered by a **Unified Problem & Concept Knowledge Graph** seeded with the **NeetCode 150** dataset. The system analyzes self-reported attempt histories, detects difficulty clusters across deep reasoning primitives (e.g., invariants, state definitions), diagnoses latent conceptual weaknesses, and generates targeted 4-step remediation paths with concept transfer verification.

## User Review Required

> [!IMPORTANT]
> **Key V1 Architectural Choices**:
> 1. **Data Seed**: Complete **NeetCode 150** dataset pre-tagged with Topics, Patterns, Similarity Edges, and Latent Reasoning Concepts.
> 2. **Execution & Diagnosis Strategy**: Uses **Graph-based Heuristic Knowledge Tracing** and weighted failure density clustering to deliver instant concept diagnosis without requiring heavy GNN training pipelines.
> 3. **Self-Reported Workflow**: Includes an interactive attempt logging drawer with time spent, outcome breakdown (Independent, Hint Used, Solution Viewed, Memorized), difficulty rating, and failure-point tags.
> 4. **Graph UI**: Interactive 2D/3D Node Network Visualization (using Vis.js Network / Cytoscape) displaying real-time mastery heatmaps across problems, patterns, and concepts.

---

## Proposed Changes

### Project Setup & Structure

#### [NEW] [package.json](file:///home/gladys-deepak/Documents/Gladys Deepak/Projects/DSA_Personaliser/package.json)
- Configure root dependencies and scripts (`npm run dev` to start both frontend Vite app and backend API server via concurrent/nodemon).

---

### Backend API & Database (`server/`)

#### [NEW] [server/index.js](file:///home/gladys-deepak/Documents/Gladys Deepak/Projects/DSA_Personaliser/server/index.js)
- Express REST API server providing endpoints for problems, attempt logging, graph data, diagnostic engine outputs, concept mastery scores, and personalized practice recommendations.

#### [NEW] [server/db.js](file:///home/gladys-deepak/Documents/Gladys Deepak/Projects/DSA_Personaliser/server/db.js)
- SQLite database schema initialization (`better-sqlite3`):
  - `problems`: ID, title, difficulty, leetcode_url, topic, pattern, description.
  - `concepts`: ID, title, category, description.
  - `problem_concepts`: Join table defining concept mapping.
  - `problem_edges`: Graph adjacency edges (Similarity, Prerequisite, Pattern link).
  - `attempts`: Attempt history (problem_id, timestamp, status, time_spent_mins, hint_used, solution_viewed, memorized, difficulty_rating, failure_reasons, notes).
  - `user_concept_mastery`: Computed mastery score (\%), confidence interval, and weakness flag per concept.

#### [NEW] [server/data/neetcode150.json](file:///home/gladys-deepak/Documents/Gladys Deepak/Projects/DSA_Personaliser/server/data/neetcode150.json)
- Structured dataset of NeetCode 150 problems categorized across 18 topics, tagged with patterns (e.g. *Sliding Window*, *Two Pointers*, *Monotonic Stack*, *Binary Search on Answer*) and deep concept nodes (e.g. *Window Invariant Maintenance*, *DP State Definition*, *Monotonicity Invariant*, *Subproblem Overlap*, *Graph State Representation*).

#### [NEW] [server/services/graphService.js](file:///home/gladys-deepak/Documents/Gladys Deepak/Projects/DSA_Personaliser/server/services/graphService.js)
- Graph traversal and structure engine:
  - Builds graph representation of Problems, Topics, Patterns, and Concepts.
  - Fetches neighborhood subgraphs, similarity connections, and concept clusters.

#### [NEW] [server/services/diagnosisEngine.js](file:///home/gladys-deepak/Documents/Gladys Deepak/Projects/DSA_Personaliser/server/services/diagnosisEngine.js)
- Heuristic Knowledge Tracing & Diagnosis Engine:
  - Calculates Concept Mastery Score:
    \[
    \text{Score}(c) = \frac{\sum w_i \cdot \text{outcome}(i)}{\sum w_i}
    \]
    where outcomes penalize solution viewing, hint reliance, and self-reported memorization vs independent derivation.
  - Detects **Difficulty Clusters**: Identifies graph regions with clustered failures across connected problems.
  - Produces diagnostic insights (e.g., *"High struggle rate on Sliding Window Invariants"*).

#### [NEW] [server/services/recommender.js](file:///home/gladys-deepak/Documents/Gladys Deepak/Projects/DSA_Personaliser/server/services/recommender.js)
- Remediation Path Generator:
  - Selects primary weak concept.
  - Constructs 4-step learning sequence: **Concept Primer** \(\rightarrow\) **Warm-up Baseline** \(\rightarrow\) **Target Re-attempt** \(\rightarrow\) **Transfer Test**.

---

### Frontend Single-Page Application (`client/`)

#### [NEW] [client/src/App.jsx](file:///home/gladys-deepak/Documents/Gladys Deepak/Projects/DSA_Personaliser/client/src/App.jsx)
- Core App shell with navigation: Dashboard, Knowledge Graph Explorer, Problem Catalog, Attempt Logger Modal, Concept Mastery Matrix, and Remediation Workspace.

#### [NEW] [client/src/components/Dashboard.jsx](file:///home/gladys-deepak/Documents/Gladys Deepak/Projects/DSA_Personaliser/client/src/components/Dashboard.jsx)
- Premium dark-mode analytics dashboard showing:
  - Top Metrics (Attempted, Solved Independently %, Active Weak Concepts, Transfer Readiness).
  - Algorithmic Difficulty Fingerprint (Topics, Patterns, Concepts).
  - Current Diagnostic Insights & Recommended Next Action card.

#### [NEW] [client/src/components/GraphExplorer.jsx](file:///home/gladys-deepak/Documents/Gladys Deepak/Projects/DSA_Personaliser/client/src/components/GraphExplorer.jsx)
- Interactive Graph Visualizer powered by Vis.js Network:
  - Color-coded node types (Problems, Patterns, Topics, Latent Concepts).
  - Real-time Heatmap Mode highlighting difficulty clusters in vibrant red/orange gradient.
  - Interactive click-to-inspect node details drawer.

#### [NEW] [client/src/components/AttemptLoggerModal.jsx](file:///home/gladys-deepak/Documents/Gladys Deepak/Projects/DSA_Personaliser/client/src/components/AttemptLoggerModal.jsx)
- Detailed self-report logger:
  - Status selection (`Solved Independently`, `Solved with Hint`, `Solved after Solution View`, `Stuck/Failed`, `Memorized`).
  - Time tracking, hint/solution checkboxes, rating sliders, and failure-point checklist.

#### [NEW] [client/src/components/ConceptMasteryMatrix.jsx](file:///home/gladys-deepak/Documents/Gladys Deepak/Projects/DSA_Personaliser/client/src/components/ConceptMasteryMatrix.jsx)
- Breakdown of concepts with mastery percentages, trend indicators, and transfer test status.

#### [NEW] [client/src/components/RemediationFlow.jsx](file:///home/gladys-deepak/Documents/Gladys Deepak/Projects/DSA_Personaliser/client/src/components/RemediationFlow.jsx)
- Interactive 4-step practice guide tailored to fix detected conceptual weaknesses.

---

## Verification Plan

### Automated Tests & Checks
1. **API & Data Ingestion Test**: Verify `neetcode150.json` initializes into SQLite with 150 problems, topics, patterns, and concept nodes properly linked.
2. **Diagnosis Logic Verification**: Run unit test script to verify failure patterns (e.g., failing 3 sliding window problems) correctly update mastery score and flag latent concept weakness.
3. **Recommendation Pipeline Test**: Ensure recommendation engine outputs a valid 4-step learning sequence including an unseen transfer problem.

### Manual Verification
1. **Graph Interactivity**: Test zooming, dragging, filtering by topic/concept, and node clicks on the Vis.js interactive graph UI.
2. **Attempt Logging Flow**: Log multiple problem attempts with varying metrics (e.g., solution viewed vs independent solve) and verify real-time dashboard update.
3. **End-to-End User Journey**: Simulate a user struggling with sliding window problems \(\rightarrow\) view diagnosis \(\rightarrow\) complete remediation sequence \(\rightarrow\) verify mastery score update.
