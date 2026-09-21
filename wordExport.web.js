import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, AlignmentType, BorderStyle
} from 'docx';

const FONT='Microsoft JhengHei';

const tx=(text,bold=false,size=22)=>new TextRun({
  text:String(text??''), bold, size,
  font:{name:FONT,eastAsia:FONT}
});

const cell=(value,bold=false)=>new TableCell({
  children:[new Paragraph({children:[tx(value,bold,20)]})],
  borders:{
    top:{style:BorderStyle.SINGLE,size:4,color:'D1D5DB'},
    bottom:{style:BorderStyle.SINGLE,size:4,color:'D1D5DB'},
    left:{style:BorderStyle.SINGLE,size:4,color:'D1D5DB'},
    right:{style:BorderStyle.SINGLE,size:4,color:'D1D5DB'}
  }
});

const lines=(v)=>String(v||'').split('\n').filter(Boolean);

function buildDocx({date,data,tasks}){
  const children=[
    new Paragraph({
      children:[tx('承邦有限公司',true,30)],
      alignment:AlignmentType.CENTER,
      spacing:{after:60}
    }),
    new Paragraph({
      children:[tx('客服工作日報表',true,28)],
      alignment:AlignmentType.CENTER,
      spacing:{after:180}
    }),
    new Paragraph({
      children:[tx('日期：'+date+'　客服：'+(data.author||''),true,22)],
      spacing:{after:240}
    }),
    new Paragraph({children:[tx('上午 0830-1200',true,24)],spacing:{after:100}})
  ];

  lines(data.morningTasks).forEach(v=>children.push(
    new Paragraph({children:[tx('• '+v,false,21)],spacing:{after:60}})
  ));

  children.push(new Paragraph({
    children:[tx('下午 1300-1730',true,24)],
    spacing:{before:180,after:100}
  }));

  lines(data.afternoonTasks).forEach(v=>children.push(
    new Paragraph({children:[tx('• '+v,false,21)],spacing:{after:60}})
  ));

  children.push(new Paragraph({
    children:[tx('工作細項',true,24)],
    spacing:{before:220,after:100}
  }));

  const detailRows=[
    new TableRow({children:[cell('工作項目',true),cell('詳細說明',true)]}),
    ...tasks.map(t=>new TableRow({
      children:[cell(t,true),cell(data.taskDetailsMap?.[t]||'')]
    }))
  ];
  children.push(new Table({
    rows:detailRows,
    width:{size:100,type:WidthType.PERCENTAGE}
  }));

  children.push(new Paragraph({
    children:[tx('工廠聯繫進度',true,24)],
    spacing:{before:220,after:100}
  }));

  const factoryRows=[
    new TableRow({children:[cell('聯繫標題',true),cell('進度說明',true)]}),
    ...(data.factoryDetails||[]).map(f=>new TableRow({
      children:[cell(f.title||''),cell(f.content||'')]
    }))
  ];
  children.push(new Table({
    rows:factoryRows,
    width:{size:100,type:WidthType.PERCENTAGE}
  }));

  children.push(new Paragraph({
    children:[tx('業務工廠回覆',true,24)],
    spacing:{before:220,after:100}
  }));

  lines(data.businessReply).forEach(v=>children.push(
    new Paragraph({children:[tx(v,false,21)],spacing:{after:60}})
  ));

  return new Document({
    styles:{
      default:{
        document:{
          run:{font:{name:FONT,eastAsia:FONT},size:22}
        }
      }
    },
    sections:[{
      properties:{
        page:{margin:{top:720,right:720,bottom:720,left:720}}
      },
      children
    }]
  });
}

function buildWordHtml({date,data,tasks}){
  const esc=(v)=>String(v??'')
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');

  const list=(v)=>lines(v).map(x=>'<p>• '+esc(x)+'</p>').join('');
  const details=tasks.map(t=>
    '<tr><td><b>'+esc(t)+'</b></td><td>'+esc(data.taskDetailsMap?.[t]||'').replace(/\n/g,'<br>')+'</td></tr>'
  ).join('');
  const factory=(data.factoryDetails||[]).map(f=>
    '<tr><td>'+esc(f.title||'')+'</td><td>'+esc(f.content||'').replace(/\n/g,'<br>')+'</td></tr>'
  ).join('');

  return `<!DOCTYPE html>
<html lang="zh-TW">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Type" content="text/html; charset=utf-8">
<title>承邦客服日報 ${esc(date)}</title>
<style>
body{font-family:"Microsoft JhengHei","Noto Sans TC",Arial,sans-serif;font-size:14pt;line-height:1.5;margin:24px;color:#111}
h1{text-align:center;font-size:24pt;margin:0 0 4px}
h2{text-align:center;font-size:20pt;margin:0 0 18px}
h3{font-size:16pt;margin:20px 0 8px}
p{margin:5px 0}
table{border-collapse:collapse;width:100%;margin:8px 0 18px}
td,th{border:1px solid #999;padding:8px;vertical-align:top}
th{font-weight:bold}
.meta{font-weight:bold;margin-bottom:16px}
</style>
</head>
<body>
<h1>承邦有限公司</h1>
<h2>客服工作日報表</h2>
<div class="meta">日期：${esc(date)}　客服：${esc(data.author||'')}</div>
<h3>上午 0830-1200</h3>
${list(data.morningTasks)}
<h3>下午 1300-1730</h3>
${list(data.afternoonTasks)}
<h3>工作細項</h3>
<table><tr><th>工作項目</th><th>詳細說明</th></tr>${details}</table>
<h3>工廠聯繫進度</h3>
<table><tr><th>聯繫標題</th><th>進度說明</th></tr>${factory}</table>
<h3>業務工廠回覆</h3>
${list(data.businessReply)}
</body>
</html>`;
}

function downloadBlob(blob,filename){
  if(typeof document==='undefined') return false;
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;
  a.download=filename;
  a.rel='noopener';
  a.style.display='none';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),5000);
  return true;
}

async function shareOrDownload(blob,filename,type){
  const file=new File([blob],filename,{type});
  if(typeof navigator!=='undefined' && navigator.share){
    try{
      const can=navigator.canShare ? navigator.canShare({files:[file]}) : false;
      if(can){
        await navigator.share({files:[file],title:filename,text:'承邦客服日報 Word'});
        return;
      }
    }catch(e){
      if(e?.name==='AbortError') return;
    }
  }
  downloadBlob(blob,filename);
}

export async function exportWord({date,data,tasks}){
  const safeAuthor=(data.author||'未填寫').replace(/[\\/:*?"<>|]/g,'_');
  const baseName='承邦客服日報_'+date+'_'+safeAuthor;

  try{
    const doc=buildDocx({date,data,tasks});
    const blob=await Packer.toBlob(doc);
    const filename=baseName+'.docx';
    await shareOrDownload(
      blob,
      filename,
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );
    return {filename,blob,format:'docx'};
  }catch(primaryError){
    const html=buildWordHtml({date,data,tasks});
    const blob=new Blob(['\\ufeff',html],{type:'application/msword;charset=utf-8'});
    const filename=baseName+'.doc';
    await shareOrDownload(blob,filename,'application/msword');
    return {filename,blob,format:'doc'};
  }
}
