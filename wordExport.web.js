import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, HeadingLevel, AlignmentType, BorderStyle
} from 'docx';

const FONT='Microsoft JhengHei';
const tx=(text,bold=false,size=22)=>new TextRun({text:String(text??''),bold,size,font:{name:FONT,eastAsia:FONT}});
const cell=(value,bold=false)=>new TableCell({
  children:[new Paragraph({children:[tx(value,bold,20)]})],
  width:{size:2400,type:WidthType.DXA},
  borders:{
    top:{style:BorderStyle.SINGLE,size:4,color:'D1D5DB'},
    bottom:{style:BorderStyle.SINGLE,size:4,color:'D1D5DB'},
    left:{style:BorderStyle.SINGLE,size:4,color:'D1D5DB'},
    right:{style:BorderStyle.SINGLE,size:4,color:'D1D5DB'}
  }
});
const lines=(v)=>String(v||'').split('\n').filter(Boolean);

export async function exportWord({date,data,tasks}){
  const children=[
    new Paragraph({children:[tx('承邦有限公司',true,30)],alignment:AlignmentType.CENTER,spacing:{after:60}}),
    new Paragraph({children:[tx('客服工作日報表',true,28)],alignment:AlignmentType.CENTER,spacing:{after:180}}),
    new Paragraph({children:[tx('日期：'+date+'　客服：'+(data.author||''),true,22)],spacing:{after:240}})
  ];
  children.push(new Paragraph({children:[tx('上午 0830-1200',true,24)],spacing:{after:100}}));
  lines(data.morningTasks).forEach(v=>children.push(new Paragraph({children:[tx('• '+v,false,21)],spacing:{after:60}})));
  children.push(new Paragraph({children:[tx('下午 1300-1730',true,24)],spacing:{before:180,after:100}}));
  lines(data.afternoonTasks).forEach(v=>children.push(new Paragraph({children:[tx('• '+v,false,21)],spacing:{after:60}})));
  children.push(new Paragraph({children:[tx('工作細項',true,24)],spacing:{before:220,after:100}}));
  const detailRows=[new TableRow({children:[cell('工作項目',true),cell('詳細說明',true)]}),...tasks.map(t=>new TableRow({children:[cell(t,true),cell(data.taskDetailsMap?.[t]||'')]}))];
  children.push(new Table({rows:detailRows,width:{size:100,type:WidthType.PERCENTAGE}}));
  children.push(new Paragraph({children:[tx('工廠聯繫進度',true,24)],spacing:{before:220,after:100}}));
  const factoryRows=[new TableRow({children:[cell('聯繫標題',true),cell('進度說明',true)]}),...(data.factoryDetails||[]).map(f=>new TableRow({children:[cell(f.title||''),cell(f.content||'')]}))];
  children.push(new Table({rows:factoryRows,width:{size:100,type:WidthType.PERCENTAGE}}));
  children.push(new Paragraph({children:[tx('業務工廠回覆',true,24)],spacing:{before:220,after:100}}));
  lines(data.businessReply).forEach(v=>children.push(new Paragraph({children:[tx(v,false,21)],spacing:{after:60}})));

  const doc=new Document({
    styles:{default:{document:{run:{font:{name:FONT,eastAsia:FONT},size:22}}}},
    sections:[{properties:{page:{margin:{top:720,right:720,bottom:720,left:720}}},children}]
  });
  const blob=await Packer.toBlob(doc);
  const filename='承邦客服日報_'+date+'_'+(data.author||'未填寫')+'.docx';
  const file=new File([blob],filename,{type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});
  let shared=false;
  if(typeof navigator!=='undefined' && navigator.share && (!navigator.canShare || navigator.canShare({files:[file]}))){
    try{await navigator.share({files:[file],title:filename,text:'承邦客服日報 Word'});shared=true;}catch(e){if(e?.name!=='AbortError')throw e;}
  }
  if(!shared && typeof document!=='undefined'){
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a'); a.href=url; a.download=filename; a.style.display='none';
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),3000);
  }
  return {filename,blob};
}
