# Canonical Anki SRS Specification and Scheduling Reference

*Document Reference: ANKI-SRS-CANON-2026*  
*Scope: Physics GRE Prep Studio — Formula Spaced Repetition Engine*  
*Mathematical Foundation: SuperMemo SM-2, Anki v2/v3 Scheduler, Cognitive Spaced-Retrieval Dynamics*

---

## 1. Executive Summary and Problem Diagnosis

### 1.1 Bug Report and Observed Failure Mode
During active formula review with an exam deadline configured at $T_{\text{exam}} = 65\text{ d}$ into the future, the grade selection user interface presented the following anomalous interval preview:

$$\text{Again: today (1)}, \quad \text{Hard: } 12\text{ d (2)}, \quad \text{Good: } 13\text{ d (3)}, \quad \text{Easy: } 13\text{ d (4)}$$

Under this presentation, the choice between rating a card $\text{Good}$ (grade $3$) versus rating it $\text{Easy}$ (grade $4$) resulted in identical scheduling: both actions yielded an identical interval of exactly $13\text{ d}$.

### 1.2 Root-Cause Mathematical Breakdown
The fault originated in an artificial heuristic introduced into `PGRE.srs.examCap()`:

$$\text{cap}(d) = \max\left(1, \min\left(d - 1, \lceil 0.20 \times d \rceil\right)\right)$$

where $d = \text{daysUntil}(T_{\text{exam}})$. For $d = 65\text{ d}$, this computation evaluated to:

$$\lceil 0.20 \times 65\rceil = 13\text{ d}$$

When evaluating a card with current interval $I = 10\text{ d}$, ease factor $EF = 2.50$, and delay $\Delta = 0\text{ d}$, the unconstrained canonical Anki SM-2 scheduler computes:

$$\begin{aligned}
I_{\text{hard}}^{\text{raw}} &= \max(I + 1, \lfloor I \times 1.20 \rfloor) = \max(11, \lfloor 10 \times 1.20 \rfloor) = 12\text{ d} \\
I_{\text{good}}^{\text{raw}} &= \max(I_{\text{hard}}^{\text{raw}} + 1, \lfloor (I + \Delta / 2) \times EF \rfloor) = \max(13, \lfloor 10 \times 2.50 \rfloor) = 25\text{ d} \\
I_{\text{easy}}^{\text{raw}} &= \max(I_{\text{good}}^{\text{raw}} + 1, \lfloor (I + \Delta) \times EF \times 1.30 \rfloor) = \max(26, \lfloor 10 \times 2.50 \times 1.30 \rfloor) = 33\text{ d}
\end{aligned}$$

Applying the post-hoc capping operation $\min(I^{\text{raw}}, \text{cap})$ independently across all passing grades produced:

$$\begin{aligned}
I_{\text{hard}} &= \min(12, 13) = 12\text{ d} \\
I_{\text{good}} &= \min(25, 13) = 13\text{ d} \\
I_{\text{easy}} &= \min(33, 13) = 13\text{ d}
\end{aligned}$$

This independent min-clamping collapsed distinct intervals onto the artificial $20\%$ ceiling, creating a degeneracy:

$$I_{\text{good}} = I_{\text{easy}} = 13\text{ d}$$

### 1.3 Pedagogical and Cognitive Consequences
1. **Destruction of Rating Incentives:** If $\text{Good}$ and $\text{Easy}$ schedule the card to the identical calendar date, the user has zero operational incentive to distinguish between normal recall effort and effortless mastery.
2. **Review Congestion and Load Inflation:** Forcing mature cards to recur at $20\%$ of the remaining exam horizon causes high-stability memory traces to be reviewed $5\times$ more frequently than optimal, creating an artificial review bottleneck that displaces vulnerable, low-stability cards.
3. **Violation of Interval Monotonicity:** A core axiom of spaced retrieval is that increasing retrieval strength MUST yield an increased interval of stability:

$$R(\text{Easy}) > R(\text{Good}) \implies I_{\text{easy}} > I_{\text{good}}$$

Collapsing these grades to equal values degrades the spaced repetition system into a fixed-interval drill.

---

## 2. Canonical Anki Scheduling Paradigm (SM-2 / v2 / v3)

### 2.1 Card Lifecycle State Machine
A flashcard exists in exactly one of four discrete lifecycle states:

$$\mathcal{S} \in \{\text{New } (0), \text{Learning } (1), \text{Review } (2), \text{Relearning / Lapse } (3)\}$$

```
                +-------------------+
                |      New (0)      |
                +-------------------+
                  |               |
             Again/Hard/Good     Easy
                  |               |
                  v               v
          +---------------+       |
          |  Learning (1) |       |
          +---------------+       |
            |           |         |
          Again     Graduate      |
            |      (Good/Easy)    |
            v           |         |
    (Reset step 0)      v         v
                  +---------------+
                  |   Review (2)  |<-------+
                  +---------------+        |
                        |                  |
                      Again             Graduate
                        |             (Good/Easy)
                        v                  |
                  +---------------+        |
                  | Relearning (3)|--------+
                  +---------------+
```

### 2.2 Rating Button Semantics Across States
Every evaluation presents four standard buttons:

$$\text{Grade } g \in \{\text{Again } (1), \text{Hard } (2), \text{Good } (3), \text{Easy } (4)\}$$

The operational behavior of each grade depends strictly on the current card state $\mathcal{S}$:

| Grade $g$ | New ($\mathcal{S} = 0$) | Learning ($\mathcal{S} = 1$) | Review ($\mathcal{S} = 2$) | Relearning ($\mathcal{S} = 3$) |
|---|---|---|---|---|
| **$\text{Again}$ ($1$)** | Enter Learning at step $0$ ($1\text{ min}$) | Reset to step $0$ ($1\text{ min}$) | Lapse counter $+1$, $EF \leftarrow EF - 0.20$, enter Relearning | Reset to step $0$ ($10\text{ min}$) |
| **$\text{Hard}$ ($2$)** | Repeat step $0$ or average $(s_0 + s_1)/2$ | Repeat current step | $EF \leftarrow EF - 0.15$, $I \leftarrow \lfloor I \times 1.20 \rfloor$ | Repeat current step |
| **$\text{Good}$ ($3$)** | Advance to step $1$ ($10\text{ min}$) | Advance step; graduate at end ($1\text{ d}$) | $EF \leftarrow EF$, $I \leftarrow \lfloor (I + \frac{\Delta}{2}) \times EF \rfloor$ | Advance step; graduate at end ($I_{\text{post-lapse}}$) |
| **$\text{Easy}$ ($4$)** | Immediate graduation to $I_{\text{easy\_init}} = 4\text{ d}$ | Immediate graduation to $I_{\text{easy\_init}} = 4\text{ d}$ | $EF \leftarrow EF + 0.15$, $I \leftarrow \lfloor (I + \Delta) \times EF \times 1.30 \rfloor$ | Immediate graduation to $I_{\text{post-lapse}} + I_{\text{easy\_init}}$ |

### 2.3 Learning and Relearning Phase Mechanics
1. **Intraday Steps:**
   - Default learning steps: $s = [1\text{ min}, 10\text{ min}]$.
   - In day-granularity implementations without sub-day timers:
     - Step $0$ ($\text{Again}$): Requeue in current session queue ($I = 0\text{ d}$, due today).
     - Step $1$ ($\text{Good}$ on new card): Advance to final intraday step.
2. **Graduation Intervals:**
   - Normal Graduation ($\text{Good}$ from final step): $I_{\text{grad}} = 1\text{ d}$.
   - Easy Graduation ($\text{Easy}$ from any step): $I_{\text{easy\_init}} = 4\text{ d}$.

### 2.4 Review Phase Mathematical Canon
In the Review state ($\mathcal{S} = 2$), cards possess a continuous Ease Factor $EF$ and an integer day interval $I \ge 1\text{ d}$.

#### 2.4.1 Ease Factor Parameters
- Starting Ease Factor: $EF_0 = 2.50$ ($250\%$).
- Minimum Ease Factor Floor: $EF_{\min} = 1.30$ ($130\%$).
- Maximum Ease Factor Ceiling: $EF_{\max} = 3.00$ ($300\%$, or uncapped).

#### 2.4.2 Delay Offset Formulation
When a review is executed $\Delta$ days late ($\Delta = \max(0, \text{today} - \text{due})$):

$$\Delta_{\text{effective}}(\text{Good}) = \frac{\Delta}{2}, \qquad \Delta_{\text{effective}}(\text{Easy}) = \Delta, \qquad \Delta_{\text{effective}}(\text{Hard}) = 0$$

#### 2.4.3 Transition Equations
1. **Rating $\text{Again}$ ($g = 1$):**

$$\begin{aligned}
\text{lapses} &\leftarrow \text{lapses} + 1 \\
EF &\leftarrow \max\left(EF_{\min}, EF - 0.20\right) \\
\text{reps} &\leftarrow 0 \\
I_{\text{again}} &= 0\text{ d} \quad (\text{intraday review today; next day interval } I_{\text{post}} = 1\text{ d})
\end{aligned}$$

2. **Rating $\text{Hard}$ ($g = 2$):**

$$\begin{aligned}
EF &\leftarrow \max\left(EF_{\min}, EF - 0.15\right) \\
I_{\text{hard}} &= \max\left(I + 1, \lfloor I \times 1.20 \rfloor\right)
\end{aligned}$$

3. **Rating $\text{Good}$ ($g = 3$):**

$$\begin{aligned}
EF &\leftarrow EF \\
I_{\text{good}} &= \max\left(I_{\text{hard}} + 1, \left\lfloor (I + \Delta / 2) \times EF \right\rfloor\right)
\end{aligned}$$

4. **Rating $\text{Easy}$ ($g = 4$):**

$$\begin{aligned}
EF &\leftarrow \min\left(EF_{\max}, EF + 0.15\right) \\
I_{\text{easy}} &= \max\left(I_{\text{good}} + 1, \left\lfloor (I + \Delta) \times EF \times 1.30 \right\rfloor\right)
\end{aligned}$$

---

## 3. The Fundamental Invariant: Strict Monotonicity

### 3.1 Formal Statement of the Invariant
For every card state evaluation, the predicted subsequent review intervals MUST satisfy strict monotonicity across all four grading choices:

$$I_{\text{again}} < I_{\text{hard}} < I_{\text{good}} < I_{\text{easy}}$$

Expressed in terms of minimal discrete day spacing:

$$\begin{aligned}
I_{\text{again}} &= 0\text{ d} \\
I_{\text{hard}} &\ge I_{\text{current}} + 1\text{ d} \\
I_{\text{good}} &\ge I_{\text{hard}} + 1\text{ d} \\
I_{\text{easy}} &\ge I_{\text{good}} + 1\text{ d}
\end{aligned}$$

### 3.2 Cognitive Science and Pedagogical Basis
1. **Exponential Retrieval Strength Scaling:**
   According to Bjork's New Theory of Disuse and the memory consolidation models of SuperMemo (Wozniak 1990) and FSRS, memory stability $S$ scales exponentially with retrieval success. Rating $\text{Easy}$ reflects higher retrieval automaticity than $\text{Good}$, which in turn reflects higher stability than $\text{Hard}$. Scheduling identical intervals for disparate stability states distorts optimal retrievability:

$$R(t) = \exp\left( - \frac{t}{S} \right)$$

2. **User Agency and Feedback Integrity:**
   If a user rates a difficult retrieval as $\text{Hard}$ and receives $12\text{ d}$, but rates a trivial retrieval as $\text{Easy}$ and receives $13\text{ d}$, the differential utility of the $\text{Easy}$ rating collapses. When $I_{\text{good}} = I_{\text{easy}}$, the four-button system degrades into a three-button system, misleading the user regarding algorithm responsiveness.

---

## 4. Exam Cap and Target Horizon Treatment

### 4.1 Rejection of Fractional Exam Bottlenecks
Standard Anki has no concept of an exam horizon; intervals grow unbounded up to `maxInterval` (default $36500\text{ d}$). When a fixed target exam date $T_{\text{exam}}$ exists, compressing intervals using a fraction of the remaining horizon ($\lceil 0.20 \times d \rceil$) is mathematically defective:

1. As $d \to 0\text{ d}$, $0.20 \times d$ forces all mature cards into daily or sub-daily churn ($13\text{ d} \to 8\text{ d} \to 4\text{ d} \to 1\text{ d}$).
2. It penalizes well-memorized cards by artificially dragging their stability down to match unlearned cards.

### 4.2 The Horizon Boundary Condition
If an exam cap is enabled to ensure every formula is reviewed at least once before the exam date, the absolute upper bound for any interval is the horizon itself:

$$H = \max\left(1, \text{daysUntil}(T_{\text{exam}}) - 1\right)$$

Under this constraint, a card scheduled today will fall strictly on or before $T_{\text{exam}} - 1\text{ d}$, guaranteeing that the card surfaces prior to exam day.

### 4.3 Monotonicity-Preserving Horizon Clamping
When raw interval calculations approach or exceed $H$, naive independent truncation $\min(I_g, H)$ collapses the higher intervals onto $H$. To preserve the fundamental invariant $I_{\text{hard}} < I_{\text{good}} < I_{\text{easy}}$, any horizon constraint MUST use backward cascading differentiation.

#### Backward Cascade Algorithm:
Given raw computed intervals $I_{\text{hard}}^{\text{raw}} < I_{\text{good}}^{\text{raw}} < I_{\text{easy}}^{\text{raw}}$ and horizon $H$:

$$\begin{aligned}
I_{\text{easy}} &= \min\left(I_{\text{easy}}^{\text{raw}}, H\right) \\
I_{\text{good}} &= \min\left(I_{\text{good}}^{\text{raw}}, I_{\text{easy}} - 1\right) \\
I_{\text{hard}} &= \min\left(I_{\text{hard}}^{\text{raw}}, I_{\text{good}} - 1\right)
\end{aligned}$$

#### Horizon Capacity Constraint:
If $H < 3$, strict day-level differentiation ($I_{\text{hard}} \ge 1, I_{\text{good}} \ge 2, I_{\text{easy}} \ge 3$) is geometrically impossible within the remaining days. In such boundary regimes ($H \le 3\text{ d}$), the scheduler transitions smoothly into the Final Pass protocol (§4.4), where all active cards enter daily queue eligibility.

### 4.4 Final Pass Protocol
When the remaining time until the exam satisfies $d \le 7\text{ d}$:
1. The standard spaced repetition growth is suspended.
2. All cards with active learning records are surfaced in the daily review pool.
3. Successful reviews confirm retention without pushing intervals past $T_{\text{exam}}$.

---

## 5. Card State and Persistence Canon

### 5.1 Card State Schema
Each card record stored in `state.cards[id]` adheres to the following exact schema:

```json
{
  "reps": 3,
  "lapses": 0,
  "interval": 25,
  "ease": 2.5,
  "due": "2026-09-26",
  "lastGrade": "good",
  "lastReviewedDay": "2026-09-01",
  "lastReviewedAt": "2026-09-01T14:30:00.000Z",
  "reviews": 3
}
```

### 5.2 Reset Specifications
Resetting card state MUST return the card to a completely unstudied, pristine condition.

#### 5.2.1 Single Card Hard Reset
To wipe a specific card $c_{\text{id}}$:
1. **State Deletion:** Remove key from the global dictionary:
   $$\text{delete } \text{state.cards}[c_{\text{id}}]$$
2. **Review Log Purge:** Filter all historical attempts from the append-only review log:
   $$\text{state.cardReviews} \leftarrow \text{state.cardReviews.filter}(r \implies r.\text{id} \ne c_{\text{id}})$$
3. **Session Queue Invalidation:** Remove active session stepping and undo caches:
   $$\text{delete } \text{study.steps}[c_{\text{id}}]$$
   $$\text{study.undo} \leftarrow \text{study.undo.filter}(u \implies u.\text{id} \ne c_{\text{id}})$$
4. **Daily Batch Recalculation:** Remove from `state.formulaDay.reviewIds` and restore to `newIds` pool if eligible.

#### 5.2.2 Bulk / Deck State Reset
To wipe the entire formula collection:
1. Re-initialize `state.cards = {}`.
2. Re-initialize `state.cardReviews = []`.
3. Clear `state.formulaDay = null`.
4. Reset daily counters: `state.today.formulaReviewed = 0`.

---

## 6. Migration and Codebase Rectification Plan

### 6.1 Rectification in `js/srs.js`

#### 6.1.1 Elimination of $0.2 \times \text{days}$ Heuristic in `examCap`
Replace the $20\%$ ceiling in `PGRE.srs.examCap()` with the true horizon boundary $H = \text{days} - 1$:

```javascript
examCap: function () {
  var settings = (PGRE.store.state && PGRE.store.state.settings) || {};
  if (settings.formulaExamCap === false) return null;
  var days = this.daysUntil(settings.examDate);
  if (!isFinite(days) || days <= 1) return null;
  return Math.max(1, days - 1);
}
```

#### 6.1.2 Enforcing Invariant Preservation in `nextIntervals`
Ensure that applying `cap` never collapses intervals. Use backward cascade clamping:

```javascript
nextIntervals: function (st) {
  var out;
  if (!st || !st.reps) {
    out = { again: 0, hard: 1, good: 1, easy: 4 };
  } else {
    var ease = st.ease || this.EASE_START;
    var ivl = Math.max(1, st.interval || 1);
    var late = 0;
    if (st.due) {
      var until = this.daysUntil(st.due);
      if (until < 0) late = -until;
    }
    var hard = Math.round(ivl * 1.2);
    if (hard < ivl + 1) hard = ivl + 1;
    var good = Math.round((ivl + late / 2) * ease);
    if (good < hard + 1) good = hard + 1;
    var easy = Math.round((ivl + late) * ease * 1.3);
    if (easy < good + 1) easy = good + 1;
    out = { again: 0, hard: hard, good: good, easy: easy };
  }

  var cap = this.examCap();
  if (cap != null && cap >= 3) {
    out.easy = Math.min(out.easy, cap);
    out.good = Math.min(out.good, out.easy - 1);
    out.hard = Math.min(out.hard, out.good - 1);
    if (out.hard < 1) out.hard = 1;
  } else if (cap != null) {
    out.hard = Math.min(out.hard, cap);
    out.good = Math.min(out.good, cap);
    out.easy = Math.min(out.easy, cap);
  }
  return out;
}
```

### 6.2 Rectification in `js/view-formulas.js`
1. Update toggle label text to clearly distinguish between **Capped to exam horizon** and **Classic Anki (uncapped)**.
2. Verify that UI grade button renderers `ivlLabel(ivls.good)` and `ivlLabel(ivls.easy)` reflect the strictly monotonic schedule.

### 6.3 Rectification in `tools/test-srs-intervals.js`
Update test suites to enforce strict monotonicity $I_{\text{again}} < I_{\text{hard}} < I_{\text{good}} < I_{\text{easy}}$ across all parameter configurations and horizons:

```javascript
function strictlyOrdered(iv) {
  return iv.again < iv.hard && iv.hard < iv.good && iv.good < iv.easy;
}

// Test case: 65 days to exam with active horizon cap
resetStore({ examDate: daysFromNow(65), formulaExamCap: true });
var afterEasy = { reps: 1, interval: 10, ease: 2.5 };
var capped = srs.nextIntervals(afterEasy);
assert(capped.hard === 12, 'Hard interval is 12 d');
assert(capped.good === 25, 'Good interval is 25 d');
assert(capped.easy === 33, 'Easy interval is 33 d');
assert(strictlyOrdered(capped), 'Strict ordering preserved under exam horizon');
```

---

## 7. Mathematical Summary Table

| Operational Variable | Symbol | Canonical Value / Formula |
|---|---|---|
| Initial Ease Factor | $EF_0$ | $2.50$ ($250\%$) |
| Ease Factor Minimum | $EF_{\min}$ | $1.30$ ($130\%$) |
| Ease Factor Maximum | $EF_{\max}$ | $3.00$ ($300\%$) |
| $\text{Again}$ Ease Delta | $\Delta EF_{\text{again}}$ | $-0.20$ |
| $\text{Hard}$ Ease Delta | $\Delta EF_{\text{hard}}$ | $-0.15$ |
| $\text{Good}$ Ease Delta | $\Delta EF_{\text{good}}$ | $0.00$ |
| $\text{Easy}$ Ease Delta | $\Delta EF_{\text{easy}}$ | $+0.15$ |
| $\text{Hard}$ Interval Multiplier | $M_{\text{hard}}$ | $1.20$ |
| $\text{Easy}$ Interval Multiplier | $M_{\text{easy}}$ | $1.30$ |
| Graduation Interval ($\text{Good}$) | $I_{\text{grad}}$ | $1\text{ d}$ |
| Easy Initial Interval | $I_{\text{easy\_init}}$ | $4\text{ d}$ |
| Minimum Hard Advance | $\delta_{\text{hard}}$ | $I_{\text{current}} + 1\text{ d}$ |
| Minimum Good Advance | $\delta_{\text{good}}$ | $I_{\text{hard}} + 1\text{ d}$ |
| Minimum Easy Advance | $\delta_{\text{easy}}$ | $I_{\text{good}} + 1\text{ d}$ |
| Exam Horizon Bound | $H$ | $\text{daysUntil}(T_{\text{exam}}) - 1\text{ d}$ |
