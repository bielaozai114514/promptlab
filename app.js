/* ============================================================
   PromptLab · 应用逻辑
   ============================================================ */

const state = {
  view: 'builder',
  mode: 'demo',
  scenario: 'summary',
  elements: {},
  arenaTask: 'sentiment',
  patternFilter: '全部',
  api: { baseUrl: '', key: '', model: '' }
};

const VIEW_META = {
  builder: { title: 'Prompt 构建器', desc: '勾选要素，实时生成结构化的 Prompt，并看到每个要素在解决什么问题。' },
  arena: { title: '策略对比实验室', desc: '同一个任务，四种策略并排跑，看清差异在哪里、代价是什么。' },
  evaluator: { title: '输出质量评估', desc: '从六个维度给一段 AI 输出打分，定位问题出在哪一句。' },
  patterns: { title: '提示词模式库', desc: '沉淀可复用的 Prompt 模式，每个都标注适用场景与常见坑。' },
  method: { title: '方法论', desc: '从要素到迭代、从评估到排错，一套可复述的 Prompt 工程框架。' }
};

/* ---------- 工具函数 ---------- */
function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), 1900);
}

function copyText(text, label) {
  const done = () => toast((label || '内容') + '已复制');
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done));
  } else {
    fallbackCopy(text, done);
  }
}

function fallbackCopy(text, done) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand('copy'); done(); } catch (e) { toast('复制失败，请手动选择'); }
  document.body.removeChild(ta);
}

/* ============================================================
   视图切换
   ============================================================ */
function switchView(view) {
  state.view = view;
  document.querySelectorAll('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.view === view));
  document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v.id === 'view-' + view));
  document.getElementById('page-title').textContent = VIEW_META[view].title;
  document.getElementById('page-desc').textContent = VIEW_META[view].desc;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ============================================================
   模块一：Prompt 构建器
   ============================================================ */
function currentScenario() {
  return BUILDER_SCENARIOS.find(s => s.id === state.scenario);
}

function resetElements() {
  const sc = currentScenario();
  state.elements = {};
  ELEMENTS.forEach(e => {
    state.elements[e.key] = { on: true, text: sc.elements[e.key] || '', open: false };
  });
}

function renderScenarioChips() {
  const box = document.getElementById('scenario-chips');
  box.innerHTML = BUILDER_SCENARIOS.map(s =>
    `<button class="chip ${s.id === state.scenario ? 'active' : ''}" data-scenario="${s.id}">${esc(s.name)}</button>`
  ).join('');
  box.querySelectorAll('[data-scenario]').forEach(b => {
    b.addEventListener('click', () => {
      state.scenario = b.dataset.scenario;
      resetElements();
      renderScenarioChips();
      renderElements();
      updatePreview();
    });
  });
}

function renderElements() {
  const box = document.getElementById('element-list');
  box.innerHTML = ELEMENTS.map(e => {
    const st = state.elements[e.key];
    return `
      <div class="element-card ${st.on ? 'on' : ''} ${st.open ? 'open' : ''}" data-key="${e.key}">
        <div class="element-head" data-toggle="${e.key}">
          <div class="element-mark">${esc(e.mark)}</div>
          <div class="element-main">
            <div><span class="element-name">${esc(e.name)}</span><span class="element-en">${esc(e.en)}</span></div>
            <div class="element-problem">${esc(e.problem)}</div>
          </div>
          <div class="switch"></div>
        </div>
        <div class="element-body">
          <div class="element-detail">${esc(e.detail)}</div>
          <label>内容（可编辑）</label>
          <textarea data-text="${e.key}">${esc(st.text)}</textarea>
        </div>
      </div>`;
  }).join('');

  box.querySelectorAll('[data-toggle]').forEach(head => {
    head.addEventListener('click', ev => {
      if (ev.target.tagName === 'TEXTAREA') return;
      const key = head.dataset.toggle;
      const st = state.elements[key];
      st.on = !st.on;
      st.open = st.on ? !st.open : false;
      renderElements();
      updatePreview();
    });
  });

  box.querySelectorAll('[data-text]').forEach(ta => {
    ta.addEventListener('input', () => {
      state.elements[ta.dataset.text].text = ta.value;
      updatePreview();
    });
  });
}

function buildPrompt() {
  const parts = [];
  ELEMENTS.forEach(e => {
    const st = state.elements[e.key];
    if (!st.on || !st.text.trim()) return;
    parts.push(st.text.trim());
  });
  return parts.join('\n\n');
}

function updatePreview() {
  const prompt = buildPrompt();
  document.getElementById('prompt-preview').textContent = prompt || '（所有要素均已关闭，Prompt 为空）';

  const onCount = ELEMENTS.filter(e => state.elements[e.key].on && state.elements[e.key].text.trim()).length;
  document.getElementById('builder-counter').textContent = onCount + ' / 7 要素';

  const gaps = ELEMENTS.filter(e => !state.elements[e.key].on || !state.elements[e.key].text.trim());
  const box = document.getElementById('builder-gaps');
  if (gaps.length === 0) {
    box.innerHTML = '<div class="tip-item ok">七大要素齐备。这是一个结构完整的 Prompt。</div>';
  } else {
    box.innerHTML = gaps.map(e =>
      `<div class="tip-item">缺少「${esc(e.name)}」——${esc(e.problem)}</div>`
    ).join('');
  }
}

function renderBuilder() {
  resetElements();
  renderScenarioChips();
  renderElements();
  updatePreview();

  document.getElementById('toggle-all').addEventListener('click', function () {
    const anyClosed = ELEMENTS.some(e => !state.elements[e.key].open);
    ELEMENTS.forEach(e => { state.elements[e.key].open = anyClosed && state.elements[e.key].on; });
    this.textContent = anyClosed ? '全部收起' : '全部展开';
    renderElements();
  });

  document.getElementById('copy-prompt').addEventListener('click', () => copyText(buildPrompt(), 'Prompt'));
}

/* ============================================================
   模块二：策略对比实验室
   ============================================================ */
function currentArenaTask() {
  return ARENA_TASKS.find(t => t.id === state.arenaTask);
}

function renderArenaChips() {
  const box = document.getElementById('arena-chips');
  box.innerHTML = ARENA_TASKS.map(t =>
    `<button class="chip ${t.id === state.arenaTask ? 'active' : ''}" data-task="${t.id}">${esc(t.name)}</button>`
  ).join('');
  box.querySelectorAll('[data-task]').forEach(b => {
    b.addEventListener('click', () => {
      state.arenaTask = b.dataset.task;
      renderArenaChips();
      renderArena();
    });
  });
}

function renderArena() {
  const task = currentArenaTask();

  document.getElementById('arena-input').innerHTML =
    `<strong>输入：</strong>${esc(task.input)}\n\n<span style="color:var(--text-3)">${esc(task.note)}</span>`;

  const order = ['zeroshot', 'fewshot', 'cot', 'structured'];
  document.getElementById('arena-grid').innerHTML = order.map(key => {
    const meta = STRATEGY_META[key];
    const d = task.strategies[key];
    return `
      <div class="arena-card tone-${meta.tone}">
        <div class="arena-head">
          <div><span class="arena-name">${esc(meta.name)}</span><span class="arena-cn">${esc(meta.cn)}</span></div>
        </div>
        <div class="arena-note">${esc(meta.note)}</div>
        <div class="arena-block">
          <div class="arena-label">PROMPT</div>
          <div class="arena-prompt">${esc(d.prompt)}</div>
        </div>
        <div class="arena-block">
          <div class="arena-label">模型输出</div>
          <div class="arena-output">${esc(d.output)}</div>
        </div>
        <div class="arena-comment">${esc(d.comment)}</div>
      </div>`;
  }).join('');

  const head = ['维度'].concat(order.map(k => STRATEGY_META[k].name)).join('</th><th>');
  const rows = SCORE_DIMS.map(dim => {
    const cells = order.map(k => {
      const v = task.strategies[k].scores[dim.key];
      const color = v >= 85 ? 'var(--green)' : v >= 65 ? 'var(--amber)' : 'var(--red)';
      return `<td><div class="score-cell"><div class="score-bar"><div class="score-fill" style="width:${v}%;background:${color}"></div></div><span class="score-val">${v}</span></div></td>`;
    }).join('');
    return `<tr><td>${esc(dim.name)}</td>${cells}</tr>`;
  }).join('');

  document.getElementById('score-table').innerHTML = `<thead><tr><th>${head}</th></tr></thead><tbody>${rows}</tbody>`;
}

/* ============================================================
   模块三：输出质量评估
   ============================================================ */
function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }

function evaluateText(text) {
  const t = text.trim();
  const len = t.length;
  const issues = [];
  const dims = {};

  /* --- 格式合规 --- */
  let fmt = 40, fmtReason = '纯自然语言段落，无任何结构标记，无法被程序直接解析。';
  let jsonOk = false;
  try {
    const parsed = JSON.parse(t);
    if (parsed && typeof parsed === 'object') { jsonOk = true; fmt = 100; fmtReason = '输出为合法 JSON，可被程序直接解析入库。'; }
  } catch (e) { /* not json */ }
  if (!jsonOk) {
    if (/\|[^\n]*\|/.test(t) && /-{3,}/.test(t)) { fmt = 88; fmtReason = '输出为 Markdown 表格，结构清晰，但需额外解析才能入库。'; }
    else if (/^\s*[-*\d]/m.test(t) && (t.match(/\n/g) || []).length >= 3) { fmt = 72; fmtReason = '使用列表结构，可读性较好，但仍需人工提取字段。'; }
  }
  dims.format = { score: fmt, reason: fmtReason };

  /* --- 完整性 --- */
  let comp;
  if (len < 80) { comp = 45; issues.push({ tag: 'high', text: '输出过短（' + len + ' 字），大概率遗漏了任务要求的要点。' }); }
  else if (len < 200) comp = 68;
  else if (len <= 900) comp = 88;
  else { comp = 78; issues.push({ tag: 'low', text: '输出偏长（' + len + ' 字），存在冗余，可能稀释了核心信息。' }); }
  if (jsonOk) comp = clamp(comp + 8, 0, 100);
  dims.completeness = { score: comp, reason: comp >= 85 ? '篇幅与结构均能覆盖任务要点。' : '篇幅偏短，可能未覆盖全部要求，建议对照任务清单逐条核对。' };

  /* --- 准确性 --- */
  const vague = ['可能', '大概', '应该', '好像', '似乎', '也许', '差不多'];
  const hitVague = vague.filter(w => t.includes(w));
  const hasBoundary = /未提及|无法确认|不确定|资料中未|没有依据/.test(t);
  let acc = 86 - hitVague.length * 7 + (hasBoundary ? 8 : 0);
  acc = clamp(acc, 20, 100);
  if (hitVague.length >= 2) issues.push({ tag: 'mid', text: '出现多个模糊限定词（' + hitVague.join('、') + '），说明结论缺乏确定依据。' });
  if (hasBoundary) issues.push({ tag: 'ok', text: '主动声明了信息边界，这是低幻觉风险的正面信号。' });
  dims.accuracy = { score: acc, reason: acc >= 85 ? '表述明确，未发现明显的含糊或自相矛盾之处。' : '存在较多模糊表述，建议改为给出可验证的明确结论。' };

  /* --- 低幻觉风险 --- */
  const filler = ['通常来说', '一般来说', '大家都知道', '众所周知', '毫无疑问', '显而易见'];
  const hitFiller = filler.filter(w => t.includes(w));
  const hasEvidence = /依据|原文|来源|根据|数据显示|实测/.test(t);
  const hasNumber = /\d/.test(t);
  let hal = 82 - hitFiller.length * 12 + (hasEvidence ? 10 : 0) + (hasNumber ? 4 : 0);
  hal = clamp(hal, 20, 100);
  if (hitFiller.length) issues.push({ tag: 'high', text: '出现「' + hitFiller[0] + '」这类无依据的普适性表述，是幻觉的典型信号。' });
  if (!hasEvidence && len > 200) issues.push({ tag: 'mid', text: '长文本中未见任何依据或来源标注，结论难以追溯。' });
  dims.hallucination = { score: hal, reason: hal >= 85 ? '未发现无依据的补充或过度推断。' : '存在缺乏支撑的表述，建议补充依据或删除。' };

  /* --- 可执行性 --- */
  const actions = ['建议', '改为', '替换', '增加', '删除', '优先', '第一步', '应当', '需要', '可以尝试'];
  const hitAction = actions.filter(w => t.includes(w));
  let act = 55 + hitAction.length * 7;
  act = clamp(act, 25, 100);
  if (hitAction.length === 0) issues.push({ tag: 'mid', text: '未出现任何行动指向的表述，结论停留在描述层面，无法直接执行。' });
  dims.actionability = { score: act, reason: act >= 80 ? '给出了具体可落地的动作指向。' : '偏描述性，建议补充「下一步该做什么」。' };

  /* --- 风格一致性 --- */
  const persons = ['你', '我', '他', '我们', '您'];
  const hitP = persons.filter(w => t.includes(w));
  let cons = 90 - Math.max(0, hitP.length - 2) * 12;
  const para = t.split(/\n{2,}/).filter(Boolean);
  if (para.length >= 3) {
    const lens = para.map(p => p.length);
    const avg = lens.reduce((a, b) => a + b, 0) / lens.length;
    const dev = lens.some(l => Math.abs(l - avg) > avg * 1.6);
    if (dev) { cons -= 8; }
  }
  cons = clamp(cons, 30, 100);
  dims.consistency = { score: cons, reason: cons >= 85 ? '语气与人称前后统一。' : '人称或段落长度波动较大，风格一致性有待加强。' };

  /* --- 加权总分 --- */
  let total = 0;
  EVAL_DIMENSIONS.forEach(d => { total += dims[d.key].score * d.weight / 100; });
  total = Math.round(total);

  return { dims, total, issues, length: len };
}

function gradeOf(score) {
  if (score >= 85) return { label: '优秀', color: 'var(--green)', bg: 'var(--green-soft)' };
  if (score >= 70) return { label: '良好', color: 'var(--blue)', bg: 'var(--blue-soft)' };
  if (score >= 55) return { label: '及格', color: 'var(--amber)', bg: 'var(--amber-soft)' };
  return { label: '待改进', color: 'var(--red)', bg: 'var(--red-soft)' };
}

function renderEvalResult(r) {
  const g = gradeOf(r.total);
  const dimHtml = EVAL_DIMENSIONS.map(d => {
    const s = r.dims[d.key];
    const c = s.score >= 85 ? 'var(--green)' : s.score >= 65 ? 'var(--amber)' : 'var(--red)';
    return `
      <div class="eval-dim">
        <div class="eval-dim-head">
          <span class="eval-dim-name">${esc(d.name)}<span style="color:var(--text-3);font-size:11px"> · 权重${d.weight}%</span></span>
          <span class="eval-dim-score">${s.score}</span>
        </div>
        <div class="eval-dim-bar"><div class="eval-dim-fill" style="width:${s.score}%;background:${c}"></div></div>
        <div class="eval-dim-reason">${esc(s.reason)}</div>
      </div>`;
  }).join('');

  const issueHtml = r.issues.length
    ? r.issues.map(i => `<div class="eval-issue"><span class="eval-issue-tag tag-${i.tag}">${i.tag === 'high' ? '高' : i.tag === 'mid' ? '中' : i.tag === 'ok' ? '优' : '低'}</span><span>${esc(i.text)}</span></div>`).join('')
    : '<div class="eval-issue"><span class="eval-issue-tag tag-ok">优</span><span>未发现明显的形式层面问题。</span></div>';

  document.getElementById('eval-result').innerHTML = `
    <div class="eval-total">
      <div class="eval-total-num" style="color:${g.color}">${r.total}</div>
      <div>
        <div class="eval-grade" style="background:${g.bg};color:${g.color}">${g.label}</div>
        <div class="eval-total-label">加权总分 · 共 ${r.length} 字</div>
      </div>
    </div>
    <div class="eval-dims">${dimHtml}</div>
    <div class="eval-issues">
      <div class="eval-issues-title">问题定位</div>
      ${issueHtml}
    </div>`;
}

async function runEvaluation() {
  const text = document.getElementById('eval-input').value.trim();
  if (!text) { toast('请先粘贴一段待评估的输出'); return; }

  if (state.mode === 'api') {
    if (!isApiReady()) {
      openApiModal();
      toast('请先配置 API 地址与 Key');
      return;
    }
    await runApiEvaluation(text);
    return;
  }

  const r = evaluateText(text);
  renderEvalResult(r);
  toast('评估完成（本地规则引擎）');
}

async function runApiEvaluation(text) {
  const box = document.getElementById('eval-result');
  box.innerHTML = '<div class="empty-state">正在调用模型评估…</div>';
  const prompt = JUDGE_PROMPT.replace('{原始任务描述}', '见待评估内容').replace('{待评估的输出}', text);
  try {
    const res = await fetch(state.api.baseUrl.replace(/\/$/, '') + '/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + state.api.key },
      body: JSON.stringify({
        model: state.api.model || 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0
      })
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || '';
    const cleaned = content.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    const dims = {};
    (parsed.scores || []).forEach(s => {
      const def = EVAL_DIMENSIONS.find(d => d.name === s.dimension);
      if (def) dims[def.key] = { score: Number(s.score) || 0, reason: s.reason || '' };
    });
    EVAL_DIMENSIONS.forEach(d => { if (!dims[d.key]) dims[d.key] = { score: 0, reason: '模型未返回该维度评分' }; });

    renderEvalResult({
      dims,
      total: Math.round(Number(parsed.weighted_total) || 0),
      issues: [{ tag: 'high', text: parsed.top_issue || '—' }, { tag: 'ok', text: '改进建议：' + (parsed.suggestion || '—') }],
      length: text.length
    });
    toast('评估完成（模型评判）');
  } catch (e) {
    const r = evaluateText(text);
    renderEvalResult(r);
    toast('模型调用失败，已回退到本地规则引擎');
  }
}

function renderEvaluator() {
  document.getElementById('judge-prompt').textContent = JUDGE_PROMPT;
  document.getElementById('copy-judge').addEventListener('click', () => copyText(JUDGE_PROMPT, '评判 Prompt'));
  document.getElementById('eval-run').addEventListener('click', runEvaluation);
  document.getElementById('eval-clear').addEventListener('click', () => {
    document.getElementById('eval-input').value = '';
    document.getElementById('eval-result').innerHTML = '<div class="empty-state">评估结果将显示在这里</div>';
  });
  document.querySelectorAll('[data-sample]').forEach(b => {
    b.addEventListener('click', () => {
      document.getElementById('eval-input').value = EVAL_SAMPLES[b.dataset.sample].text;
      toast('已载入' + EVAL_SAMPLES[b.dataset.sample].label);
    });
  });
}

/* ============================================================
   模块四：模式库
   ============================================================ */
function renderPatternFilters() {
  const tags = ['全部'].concat([...new Set(PATTERNS.map(p => p.tag))]);
  const box = document.getElementById('pattern-filters');
  box.innerHTML = tags.map(t =>
    `<button class="chip ${t === state.patternFilter ? 'active' : ''}" data-filter="${esc(t)}">${esc(t)}</button>`
  ).join('');
  box.querySelectorAll('[data-filter]').forEach(b => {
    b.addEventListener('click', () => {
      state.patternFilter = b.dataset.filter;
      renderPatternFilters();
      renderPatterns();
    });
  });
}

function renderPatterns() {
  const list = state.patternFilter === '全部' ? PATTERNS : PATTERNS.filter(p => p.tag === state.patternFilter);
  document.getElementById('patterns-count').textContent = '共 ' + list.length + ' 个模式';
  document.getElementById('pattern-grid').innerHTML = list.map(p => `
    <div class="pattern-card">
      <div class="pattern-head">
        <span class="pattern-name">${esc(p.name)}</span>
        <span class="pattern-en">${esc(p.en)}</span>
        <span class="pattern-tag">${esc(p.tag)}</span>
      </div>
      <div class="pattern-when">适用：${esc(p.when)}</div>
      <div class="pattern-template">${esc(p.template)}</div>
      <div class="pattern-pitfall">${esc(p.pitfall)}</div>
    </div>`).join('');
}

/* ============================================================
   模块五：方法论
   ============================================================ */
const ITERATION_DIMS = [
  { name: '角色设定', before: '（无）', after: '你是一位资深内容编辑，擅长在压缩篇幅的同时保留全部关键事实。', gain: '输出从通用口吻变为领域口吻，术语和判断尺度自动对齐。' },
  { name: '任务拆解', before: '帮我看看这段文字', after: '将长文压缩为摘要，并按「标题 / 摘要 / 要点 / 实体」四部分输出。', gain: '交付物边界清晰，减少来回返工。' },
  { name: '约束边界', before: '（无）', after: '摘要不超过原文 20%；必须保留所有数字与专有名词；不得引入原文没有的信息。', gain: '把事后人工检查变成事前规则约束。' },
  { name: '输出格式', before: '（无）', after: '严格输出 JSON，字段为 title / summary / key_points / entities。', gain: '输出可被程序直接解析，接入自动化流程。' },
  { name: '示例引导', before: '（无）', after: '给出一个输入输出样例，锚定字段写法与详略程度。', gain: '消除风格歧义，尤其适合格式复杂的任务。' },
  { name: '自检机制', before: '（无）', after: '输出前自查：是否遗漏关键数字？是否出现原文没有的信息？', gain: '把质量校验前移到生成阶段，拦截低级错误。' }
];

function renderMethod() {
  const elCards = ELEMENTS.map(e => `
    <div class="method-card">
      <div class="method-card-title">${esc(e.mark)} ${esc(e.name)} <span style="font-family:var(--mono);font-size:11px;color:var(--text-3)">${esc(e.en)}</span></div>
      <div class="method-card-body">${esc(e.problem)}<br><br>${esc(e.detail)}</div>
    </div>`).join('');

  const iterRows = ITERATION_DIMS.map(d => `
    <div class="method-card">
      <div class="method-card-title">${esc(d.name)}</div>
      <div class="method-card-body">
        <div style="color:var(--red);margin-bottom:4px">改前：${esc(d.before)}</div>
        <div style="color:var(--green);margin-bottom:7px">改后：${esc(d.after)}</div>
        <div style="color:var(--text-3);font-size:12px">收益：${esc(d.gain)}</div>
      </div>
    </div>`).join('');

  const evalRows = EVAL_DIMENSIONS.map(d => `
    <div class="method-card">
      <div class="method-card-title">${esc(d.name)} <span style="font-weight:400;color:var(--text-3);font-size:12px">权重 ${d.weight}%</span></div>
      <div class="method-card-body">${esc(d.desc)}</div>
    </div>`).join('');

  const failRows = FAILURE_MODES.map(f => `
    <div class="failure-card">
      <div class="failure-name">${esc(f.name)}</div>
      <div class="failure-row"><span class="failure-key">现象</span><span>${esc(f.symptom)}</span></div>
      <div class="failure-row"><span class="failure-key">成因</span><span>${esc(f.cause)}</span></div>
      <div class="failure-row"><span class="failure-key">修复</span><span class="failure-fix">${esc(f.fix)}</span></div>
    </div>`).join('');

  document.getElementById('method-body').innerHTML = `
    <div class="method-hero">
      <h2>Prompt 工程不是玄学，是可以拆解、可以验证的工程</h2>
      <p>很多人把写 Prompt 当成「凭感觉调」。但这套流程其实有明确的输入输出：<strong>要素决定结构，策略决定能力上限，评估决定迭代方向</strong>。下面这套框架，从最基础的七要素解剖开始，一路到常见的失败模式与修复方案——它是一套可以完整复述、也能直接落到工作里的操作框架。</p>
    </div>

    <div class="method-section">
      <h3>一、Prompt 的解剖结构</h3>
      <div class="method-grid">${elCards}</div>
    </div>

    <div class="method-section">
      <h3>二、迭代的六个维度</h3>
      <p style="font-size:13px;color:var(--text-2);margin-bottom:12px;line-height:1.75">当一段 Prompt 效果不好时，不要盲目重写。按下面六个维度逐条检查，通常能定位到具体是哪个环节缺失。这也是 Prompt 从「能用」到「稳定可用」的必经路径。</p>
      <div class="method-grid">${iterRows}</div>
    </div>

    <div class="method-section">
      <h3>三、质量评估体系</h3>
      <p style="font-size:13px;color:var(--text-2);margin-bottom:12px;line-height:1.75">评估是迭代的前提——没有稳定的评价标准，优化就只能靠感觉。下面六个维度按重要性赋权，构成一个可复用的打分表。形式层面的问题可以用规则引擎自动检出，语义层面则需要 LLM-as-a-Judge。</p>
      <div class="method-grid">${evalRows}</div>
    </div>

    <div class="method-section">
      <h3>四、常见失败模式与修复</h3>
      ${failRows}
    </div>

    <div class="method-section">
      <h3>五、策略选择：什么任务用什么打法</h3>
      <div class="method-grid">
        <div class="method-card">
          <div class="method-card-title">事实检索 / 格式转换</div>
          <div class="method-card-body">用 <strong>Zero-shot</strong>。这类任务没有推理空间，加了思维链反而可能把正确答案想错，还平白增加成本。</div>
        </div>
        <div class="method-card">
          <div class="method-card-title">风格迁移 / 复杂格式</div>
          <div class="method-card-body">用 <strong>Few-shot</strong>。用样例传递风格比用形容词描述准确得多，2-5 个示例性价比最高。</div>
        </div>
        <div class="method-card">
          <div class="method-card-title">多步推理 / 数学计算</div>
          <div class="method-card-body">用 <strong>Chain-of-Thought</strong>。这是收益最显著的一类任务，思维链能把准确率拉开一个量级。</div>
        </div>
        <div class="method-card">
          <div class="method-card-title">需要入库 / 批量处理</div>
          <div class="method-card-body">用 <strong>Structured Output</strong>。给全字段名、类型与枚举值，让输出零解析成本直接进下游系统。</div>
        </div>
        <div class="method-card">
          <div class="method-card-title">依赖私有知识</div>
          <div class="method-card-body">用 <strong>上下文注入 + 边界声明</strong>。必须显式写「仅依据以下资料」和「未提及则回答不知道」，否则幻觉几乎不可避免。</div>
        </div>
        <div class="method-card">
          <div class="method-card-title">质量要求极高</div>
          <div class="method-card-body">叠加 <strong>Self-Refine</strong>。给出可判定的检查清单让模型自审，成本低、拦截率可观。</div>
        </div>
      </div>
    </div>`;
}

/* ============================================================
   API 配置
   ============================================================ */
const API_PROVIDERS = [
  { name: 'OpenAI', base: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
  { name: 'DeepSeek', base: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
  { name: '通义千问', base: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model: 'qwen-plus' },
  { name: '智谱 GLM', base: 'https://open.bigmodel.cn/api/paas/v4', model: 'glm-4-flash' },
  { name: 'Moonshot', base: 'https://api.moonshot.cn/v1', model: 'moonshot-v1-8k' }
];

const API_STORE_KEY = 'promptlab.api';

function loadApiConfig() {
  try {
    const raw = localStorage.getItem(API_STORE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      state.api = {
        baseUrl: parsed.baseUrl || '',
        key: parsed.key || '',
        model: parsed.model || ''
      };
    }
  } catch (e) { /* 本地存储不可用时静默降级 */ }
}

function persistApiConfig() {
  try { localStorage.setItem(API_STORE_KEY, JSON.stringify(state.api)); } catch (e) { /* ignore */ }
}

function isApiReady() {
  return !!(state.api.baseUrl && state.api.key);
}

function setApiStatus(msg, kind) {
  const el = document.getElementById('api-status');
  if (!msg) { el.className = 'modal-status'; el.textContent = ''; return; }
  el.className = 'modal-status show ' + (kind || 'info');
  el.textContent = msg;
}

function openApiModal() {
  document.getElementById('api-base').value = state.api.baseUrl || '';
  document.getElementById('api-key').value = state.api.key || '';
  document.getElementById('api-model').value = state.api.model || '';
  setApiStatus('', '');
  document.getElementById('api-modal').classList.add('show');
}

function closeApiModal() {
  document.getElementById('api-modal').classList.remove('show');
}

function saveApiConfig() {
  const baseUrl = document.getElementById('api-base').value.trim();
  const key = document.getElementById('api-key').value.trim();
  const model = document.getElementById('api-model').value.trim();
  if (!baseUrl || !key) { setApiStatus('API 地址和 API Key 都需要填写。', 'err'); return; }
  state.api = { baseUrl: baseUrl, key: key, model: model };
  persistApiConfig();
  updateModeUI();
  setApiStatus('已保存。现在到「输出质量评估」里点开始评估，就会调用真实模型评判了。', 'ok');
  toast('API 配置已保存');
}

function clearApiConfig() {
  state.api = { baseUrl: '', key: '', model: '' };
  persistApiConfig();
  ['api-base', 'api-key', 'api-model'].forEach(function (id) { document.getElementById(id).value = ''; });
  updateModeUI();
  setApiStatus('配置已清除。', 'info');
}

async function testApiConnection() {
  const baseUrl = document.getElementById('api-base').value.trim();
  const key = document.getElementById('api-key').value.trim();
  const model = document.getElementById('api-model').value.trim() || 'gpt-4o-mini';
  if (!baseUrl || !key) { setApiStatus('请先填写 API 地址和 API Key。', 'err'); return; }

  setApiStatus('正在测试连接…', 'info');
  try {
    const res = await fetch(baseUrl.replace(/\/$/, '') + '/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
      body: JSON.stringify({ model: model, messages: [{ role: 'user', content: 'ping' }], max_tokens: 5 })
    });
    if (!res.ok) {
      const body = await res.text();
      setApiStatus('连接失败（HTTP ' + res.status + '）：' + body.slice(0, 180), 'err');
      return;
    }
    setApiStatus('连接成功，模型可用。可以直接保存了。', 'ok');
  } catch (e) {
    setApiStatus('连接失败：' + (e.message || '未知错误') + '。若浏览器直连，多半是对方未开放跨域（CORS），可改用支持 CORS 的中转地址。', 'err');
  }
}

function renderApiPresets() {
  const box = document.getElementById('api-presets');
  box.innerHTML = API_PROVIDERS.map(function (p, i) {
    return '<button class="chip" data-provider="' + i + '">' + esc(p.name) + '</button>';
  }).join('');
  box.querySelectorAll('[data-provider]').forEach(function (b) {
    b.addEventListener('click', function () {
      const p = API_PROVIDERS[Number(b.dataset.provider)];
      document.getElementById('api-base').value = p.base;
      document.getElementById('api-model').value = p.model;
      setApiStatus('已填入 ' + p.name + ' 的默认地址与模型，请补充你自己的 API Key。', 'info');
    });
  });
}

function initApi() {
  loadApiConfig();
  renderApiPresets();

  document.getElementById('api-close').addEventListener('click', closeApiModal);
  document.getElementById('api-save').addEventListener('click', saveApiConfig);
  document.getElementById('api-clear').addEventListener('click', clearApiConfig);
  document.getElementById('api-test').addEventListener('click', testApiConnection);

  document.getElementById('api-modal').addEventListener('click', function (e) {
    if (e.target.id === 'api-modal') closeApiModal();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeApiModal();
  });

  updateModeUI();
}

/* ============================================================
   模式切换
   ============================================================ */
function updateModeUI() {
  document.querySelectorAll('.mode-btn').forEach(function (b) {
    b.classList.toggle('active', b.dataset.mode === state.mode);
  });

  const hint = document.getElementById('eval-mode-hint');
  if (hint) {
    hint.textContent = state.mode === 'api'
      ? (isApiReady() ? '模型评判 · 已配置' : '模型评判 · 未配置')
      : '本地规则引擎';
  }

  const apiBtn = document.querySelector('.mode-btn[data-mode="api"]');
  if (apiBtn) {
    apiBtn.innerHTML = '接入模型' + (isApiReady() ? '<span class="mode-dot"></span>' : '');
  }
}

function applyMode(mode) {
  state.mode = mode;
  updateModeUI();
  if (mode === 'api') openApiModal();
}

/* ============================================================
   初始化
   ============================================================ */
function init() {
  document.querySelectorAll('.nav-item').forEach(b => {
    b.addEventListener('click', () => switchView(b.dataset.view));
  });

  document.querySelectorAll('.mode-btn').forEach(b => {
    b.addEventListener('click', () => applyMode(b.dataset.mode));
  });

  initApi();

  document.getElementById('stat-elements').textContent = ELEMENTS.length;
  document.getElementById('stat-patterns').textContent = PATTERNS.length;

  renderBuilder();
  renderArenaChips();
  renderArena();
  renderEvaluator();
  renderPatternFilters();
  renderPatterns();
  renderMethod();
}

document.addEventListener('DOMContentLoaded', init);
