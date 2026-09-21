import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, AlignmentType, BorderStyle, VerticalAlignTable
} from 'docx';

const FONT = 'Microsoft JhengHei';
const FONT_SIZE = 22; // 11 pt
const FIXED_AUTHOR = '吳英德';
const BORDER = { style: BorderStyle.SINGLE, size: 1, color: '000000' };
const BORDERS = { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER };

function toSafeText(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value.map(toSafeText).filter(Boolean).join('\n');
  }
  if (typeof value === 'object') {
    for (const key of ['text', 'value', 'title', 'name', 'content', 'label']) {
      if (value[key] !== undefined && value[key] !== null) {
        const result = toSafeText(value[key]);
        if (result) return result;
      }
    }
    return '';
  }
  return '';
}

const tx = (value, bold = false, size = FONT_SIZE) => new TextRun({
  text: toSafeText(value),
  bold,
  size,
  font: { name: FONT, eastAsia: FONT, ascii: FONT, hAnsi: FONT }
});

const p = (value = '', center = false, bold = false) => new Paragraph({
  children: [tx(value, bold)],
  alignment: center ? AlignmentType.CENTER : AlignmentType.LEFT,
  spacing: { before: 0, after: 0, line: 240 }
});

function cell(children, { columnSpan, rowSpan, width, center = false, bold = false } = {}) {
  let content;
  if (Array.isArray(children)) {
    content = children;
  } else if (children instanceof Paragraph) {
    // IMPORTANT: do not wrap a Paragraph again, otherwise it becomes "[object Object]".
    content = [children];
  } else {
    content = [p(children, center, bold)];
  }

  return new TableCell({
    children: content,
    width: width ? { size: width, type: WidthType.PERCENTAGE } : undefined,
    columnSpan,
    rowSpan,
    verticalAlign: VerticalAlignTable.CENTER,
    margins: { top: 100, bottom: 100, left: 100, right: 100 },
    borders: BORDERS
  });
}

const lines = (value) => toSafeText(value)
  .split(/\n/)
  .map(x => x.trim())
  .filter(Boolean);

const displayDate = (date) => {
  const m = String(date || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? m[2] + '/' + m[3] : '';
};

const fileDate = (date) => {
  const m = String(date || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? m[1] + m[2] + m[3] : '';
};

function makeActivityRow(title, detail) {
  return new TableRow({
    cantSplit: true,
    children: [
      cell(p(toSafeText(title), true, true), { columnSpan: 2, width: 25 }),
      cell(lines(detail).map(x => p(x, false, false)), { width: 75 })
    ]
  });
}

function makeSectionRow(title) {
  return new TableRow({
    cantSplit: true,
    children: [
      cell(p('   ' + toSafeText(title), false, false), { columnSpan: 3 })
    ]
  });
}

function buildTemplateDoc({ date, data, tasks }) {
  const morning = lines(data?.morningTasks);
  const afternoon = lines(data?.afternoonTasks);
  const safeTasks = (Array.isArray(tasks) ? tasks : []).map(toSafeText).filter(Boolean);

  const rows = [];

  // 完全比照提供的日誌表格邏輯：
  // 3 欄、10% / 15% / 75%，標題日期列、上午/下午列、
  // 工作細項、工廠聯繫進度、業務工廠回覆、最底部客服。
  rows.push(new TableRow({
    cantSplit: true,
    children: [
      cell(p('承邦有限公司   客服工作日報表', true, true), {
        columnSpan: 2,
        width: 25
      }),
      cell(p(displayDate(date), false, false), { width: 75 })
    ]
  }));

  rows.push(new TableRow({
    cantSplit: true,
    children: [
      cell(p('時間', true, false), { rowSpan: 2, width: 10 }),
      cell([p('上午', true, false), p('0830-1200', true, false)], { width: 15 }),
      cell(
        morning.length ? morning.map(x => p(x, true, true)) : [p('', true, true)],
        { width: 75 }
      )
    ]
  }));

  rows.push(new TableRow({
    cantSplit: true,
    children: [
      cell([p('下午', true, false), p('1300-1730', true, false)], { width: 15 }),
      cell(
        afternoon.length ? afternoon.map(x => p(x, true, true)) : [p('', true, true)],
        { width: 75 }
      )
    ]
  }));

  for (const task of safeTasks) {
    rows.push(makeActivityRow(task, data?.taskDetailsMap?.[task] || ''));
  }

  const factoryDetails = Array.isArray(data?.factoryDetails) ? data.factoryDetails : [];
  rows.push(makeSectionRow('工廠聯繫進度'));

  for (const item of factoryDetails) {
    const title = toSafeText(item?.title);
    const content = toSafeText(item?.content);
    if (title || content) rows.push(makeActivityRow(title, content));
  }

  rows.push(makeSectionRow('業務工廠回覆'));

  const businessReply = lines(data?.businessReply);
  if (businessReply.length) {
    rows.push(new TableRow({
      cantSplit: true,
      children: [cell(businessReply.map(x => p(x, false, false)), { columnSpan: 3 })]
    }));
  }

  // 固定比照提供檔案最底端：客服: 吳英德
  rows.push(new TableRow({
    cantSplit: true,
    children: [cell(p('客服: 吳英德', false, false), { columnSpan: 3 })]
  }));

  return new Document({
    styles: {
      default: {
        document: {
          run: {
            font: { name: FONT, eastAsia: FONT, ascii: FONT, hAnsi: FONT },
            size: FONT_SIZE
          }
        }
      }
    },
    sections: [{
      properties: {
        page: { margin: { top: 720, right: 720, bottom: 720, left: 720 } }
      },
      children: [
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          columnWidths: [10, 15, 75],
          rows
        })
      ]
    }]
  });
}

function downloadBlob(blob, filename) {
  if (typeof document === 'undefined') return false;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  return true;
}

async function shareOrDownload(blob, filename, type) {
  const file = new File([blob], filename, { type });
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      const canShare = navigator.canShare ? navigator.canShare({ files: [file] }) : false;
      if (canShare) {
        await navigator.share({
          files: [file],
          title: filename,
          text: '承邦客服工作日誌'
        });
        return;
      }
    } catch (e) {
      if (e?.name === 'AbortError') return;
    }
  }
  downloadBlob(blob, filename);
}

export async function exportWord({ date, data, tasks }) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date || ''))) {
    throw new Error('請先選擇有效日期，再匯出 Word。');
  }

  const filename = fileDate(date) + '工作日誌.docx';
  const doc = buildTemplateDoc({ date, data, tasks });
  const blob = await Packer.toBlob(doc);

  await shareOrDownload(
    blob,
    filename,
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  );

  return { filename, blob, format: 'docx', author: FIXED_AUTHOR };
}
