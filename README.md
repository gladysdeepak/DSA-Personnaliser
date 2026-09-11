# Personalized DSA Learning

> **A graph-based personalized Data Structures & Algorithms learning platform that models relationships between coding problems, analyzes user solving behavior to infer latent conceptual weaknesses, and generates targeted practice sequences to build genuine problem-solving and concept transfer ability.**

---

##  The Core Problem

Standard platforms like LeetCode track **problem completion** (`Solved / Unsolved`). However, this leads to a fundamental learning flaw:

1. A user attempts a problem, gets stuck, and views the editorial/solution.
2. They understand the code temporarily or mark it as solved.
3. Later, when given a *different* problem requiring the identical underlying reasoning primitive (e.g., maintaining a sliding window invariant or formulating a DP state), they fail again.

### The Solution: Concept Mastery & Transfer Diagnosis
This platform treats DSA problems as a **Unified Knowledge Graph**. By analyzing multi-dimensional attempt histories (time spent, solution views, hint reliance, memorization flags, and failure checklists), the platform identifies **latent reasoning bottlenecks** (e.g., *"Struggles with dynamic window shrink logic"* rather than *"Failed Minimum Window Substring"*).

---

##  Key Features

### 1.  Pre-Populated NeetCode 150 Knowledge Graph
- **150 Benchmark Problems** across 18 core topics.
- **27 Latent Reasoning Concepts** (e.g., *Sliding Window Invariant & Shrink Condition*, *DP State Definition*, *Monotonic Stack Boundary*, *BST Range Validation*, *Bitwise XOR Cancellation*).
- **Multi-Layer Edges**: Concept requirements, prerequisite flows, similarity links, and topic memberships.

### 2.  Interactive Knowledge Graph Explorer
- **Vis.js 2D Network Canvas**: Drag, zoom, and inspect nodes in real time.
- **Heatmap Mode**: Dynamic neon red/amber glow highlighting flagged concept weaknesses and high-density failure clusters.
- **Topic Sub-network Isolator**: Filter nodes by specific topics (*Arrays & Hashing*, *Sliding Window*, *Dynamic Programming*, etc.) to inspect focused sub-networks without text clutter.
- **Toggleable Edge Labels**: Clean visualization with color-coded edge styles (Dashed purple = Concept req, Amber arrow = Prerequisite flow).

### 3.  Self-Reported Attempt & Behavior Tracker
- Rich attempt logging drawer capturing:
  - **Outcome Status**: `Solved Independently`, `Solved with Hint`, `Solved after Solution View`, `Memorized Approach`, `Failed/Stuck`.
  - **Behavioral Metrics**: Time spent (mins), perceived difficulty rating (`Easy`, `Fair`, `Challenging`, `Overwhelming`).
  - **Assistance Flags**: Hint used, solution viewed, or memorization felt.
  - **Failure Point Checklist**: *"Couldn't identify initial pattern"*, *"Struggled with state formulation"*, *"Boundary condition bug"*.

### 4.  Latent Diagnosis & Heuristic Knowledge Tracing Engine
- **Mastery Score Calculation**: Computes concept mastery percentages \(M(c) \in [0, 100\%]\) using weighted outcome scoring that penalizes solution-viewing and memorization reliance.
- **Diagnostic Insights**: Automatically generates natural language diagnostic reports detailing the exact source of difficulty.

### 5. Targeted 4-Step Remediation & Transfer Sequence
Generates personalized 4-step practice plans targeting diagnosed weaknesses:
1. **Step 1: Conceptual Primer**: Core reasoning invariants, trigger conditions, and common pitfalls.
2. **Step 2: Warm-up Baseline Practice**: Accessible problem directly testing the concept.
3. **Step 3: Target Problem Remediation**: Re-tackling the previous failure point.
4. **Step 4: Unseen Concept Transfer Test**: Solving an unseen problem sharing the identical concept node to verify genuine concept transfer.

### 6. Algorithmic Difficulty Fingerprint Dashboard
- Visual breakdown of mastery across Topics, Patterns, and Concepts.
- Top metrics: Total Attempts, Independent Solves %, Weak Concepts Count, and Concept Transfer Readiness Score.

---

##  Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend UI** | React (Vite), Vanilla CSS Glassmorphism Design System, Lucide Icons, Canvas Confetti |
| **Graph Visualization** | Vis.js Network (`vis-network`) |
| **Backend API** | Node.js, Express.js |
| **Database** | SQLite (`sqlite3`) |
| **Diagnostic Logic** | Graph Traversal & Heuristic Knowledge Tracing Engine |

---

##  Project Structure

```
DSA_Personaliser/
├── package.json                 # Monorepo configuration (concurrently runner)
├── server/                      # Express REST API & Database logic
│   ├── index.js                 # API routes & server initialization
│   ├── db.js                    # SQLite database schema & NeetCode 150 seed runner
│   ├── data/
│   │   └── neetcode150.json     # Seed dataset (150 problems, 27 concept primitives)
│   └── services/
│       ├── graphService.js      # Vis.js graph nodes & edges formatter
│       ├── diagnosisEngine.js   # Heuristic Knowledge Tracing & weakness detection
│       └── recommender.js       # 4-step practice sequence generator
└── client/                      # Vite + React Single Page Application
    ├── index.html
    └── src/
        ├── index.css            # Dark mode glassmorphism theme & CSS variables
        ├── App.jsx              # Navigation header & main tab routing
        └── components/
            ├── Dashboard.jsx             # Analytics dashboard & diagnostic alerts
            ├── GraphExplorer.jsx         # Vis.js interactive graph explorer
            ├── ProblemCatalog.jsx        # Filterable NeetCode 150 table
            ├── AttemptLoggerModal.jsx    # Multi-dimensional attempt logging modal
            ├── ConceptMasteryMatrix.jsx  # 27 concept mastery matrix cards
            └── RemediationFlow.jsx       # Interactive 4-step practice & transfer flow
```

---

##  Getting Started & Local Execution

### Prerequisites
- Node.js (v18+)
- npm (v9+)

### Installation

1. **Clone or navigate to the project directory**:
   ```bash
   cd "/home/gladys-deepak/Documents/Gladys Deepak/Projects/DSA_Personaliser"
   ```

2. **Install root & backend dependencies**:
   ```bash
   npm install
   ```

3. **Install client dependencies**:
   ```bash
   cd client
   npm install
   cd ..
   ```

### Running the Application

Run the full stack with a single command from the project root:

```bash
npm run dev
```

## 🔌 API Endpoints Summary

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Server healthcheck |
| `GET` | `/api/graph` | Fetch complete graph nodes and edges for Vis.js |
| `GET` | `/api/problems` | Fetch all 150 problems with user attempt status |
| `GET` | `/api/problems/:id` | Fetch single problem metadata & attempt timeline |
| `POST` | `/api/attempts` | Log a new problem attempt & recalculate concept mastery |
| `GET` | `/api/concepts` | Fetch 27 concepts with mastery scores & weakness flags |
| `GET` | `/api/diagnostics` | Fetch detected difficulty clusters & diagnostic insights |
| `GET` | `/api/profile` | Fetch user algorithmic difficulty fingerprint summary |
| `GET` | `/api/recommendation` | Fetch personalized 4-step remediation practice path |

---

