import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, AlignmentType, BorderStyle, VerticalAlignTable
} from 'docx';

const FONT='Microsoft JhengHei';
const BORDER={style:BorderStyle.SINGLE,size:1,color:'000000'};
const BORDERS={top:BORDER,bottom:BORDER,left:BORDER,right:BORDER};

const tx=(text,bold=false,size=22)=>new TextRun({
  text:String(text??''),bold,size,
  font:{name:FONT,eastAsia:FONT,ascii:FONT,hAnsi:FONT}
});

const p=(text='',center=false,bold=false)=>new Paragraph({
  children:[tx(text,bold,22)],
  alignment:center?AlignmentType.CENTER:AlignmentType.LEFT,
  spacing:{before:0,after:0,line:240}
});

const cell=(children,{columnSpan,rowSpan,width,center=false}={})=>new TableCell({
  children:Array.isArray(children)?children:[p(children,center)],
  width:width?{size:width,type:WidthType.PERCENTAGE}:undefined,
  columnSpan,
  rowSpan,
  verticalAlign:VerticalAlignTable.CENTER,
  margins:{top:100,bottom:100,left:100,right:100},
  borders:BORDERS
});

const textCell=(text,opts={})=>cell(p(text,opts.center??true,opts.bold??false),opts);

const lines=(v)=>String(v||'').split(/\n/).map(x=>x.trim()).filter(Boolean);
const displayDate=(date)=>{
  const m=String(date||'').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m?m[2]+'/'+m[3]:String(date||'');
};
const fileDate=(date)=>{
  const m=String(date||'').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m?m[1]+m[2]+m[3]:String(date||'').replace(/\D/g,'');
};
const activityText=(v)=>lines(v).join('\n');

function makeActivityRow(title,detail){
  return new TableRow({
    cantSplit:true,
    children:[
      cell(p(title,true,true),{columnSpan:2,width:25}),
      cell(lines(detail).map(x=>p(x,false,false)),{width:75})
    ]
  });
}

function makeSectionRow(title){
  return new TableRow({
    cantSplit:true,
    children:[
      cell(p('   '+title,false,false),{columnSpan:3})
    ]
  });
}

function buildTemplateDoc({date,data,tasks}){
  const morning=lines(data.morningTasks);
  const afternoon=lines(data.afternoonTasks);

  const rows=[];

  // 第一列完全依照使用者提供的「20260903工作日誌.docx」結構：
  // 標題＋日期、時間／上午／下午、工作細項、工廠聯繫進度、業務工廠回覆。
  rows.push(new TableRow({
    cantSplit:true,
    children:[
      cell(p('承邦有限公司   客服工作日報表',true,true),{columnSpan:2,width:25}),
      cell(p(displayDate(date),false,false),{width:75})
    ]
  }));

  rows.push(new TableRow({
    cantSplit:true,
    children:[
      cell(p('時間',true,false),{rowSpan:2,width:10}),
      cell([p('上午',true,false),p('0830-1200',true,false)],{width:15}),
      cell(morning.length?morning.map(x=>p(x,true,true)):[p('',true,true)],{width:75})
    ]
  }));

  rows.push(new TableRow({
    cantSplit:true,
    children:[
      cell([p('下午',true,false),p('1300-1730',true,false)],{width:15}),
      cell(afternoon.length?afternoon.map(x=>p(x,true,true)):[p('',true,true)],{width:75})
    ]
  }));

  for(const task of tasks){
    rows.push(makeActivityRow(task,data.taskDetailsMap?.[task]||''));
  }

  if((data.factoryDetails||[]).length){
    rows.push(makeSectionRow('工廠聯繫進度'));
    for(const f of data.factoryDetails){
      if((f.title||f.content||'').trim()) rows.push(makeActivityRow(f.title||'',f.content||''));
    }
  }

  rows.push(makeSectionRow('業務工廠回覆'));
  if(data.businessReply){
    rows.push(new TableRow({
      cantSplit:true,
      children:[cell(lines(data.businessReply).map(x=>p(x,false,false)),{columnSpan:3})]
    }));
  }

  rows.push(new TableRow({
    cantSplit:true,
    children:[cell(p('客服: '+(data.author||''),false,false),{columnSpan:3})]
  }));

  return new Document({
    styles:{
      default:{
        document:{
          run:{font:{name:FONT,eastAsia:FONT,ascii:FONT,hAnsi:FONT},size:22}
        }
      }
    },
    sections:[{
      properties:{
        page:{
          margin:{top:720,right:720,bottom:720,left:720}
        }
      },
      children:[
        new Table({
          width:{size:100,type:WidthType.PERCENTAGE},
          columnWidths:[10,15,75],
          rows
        })
      ]
    }]
  });
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
        await navigator.share({files:[file],title:filename,text:'承邦客服工作日誌'});
        return;
      }
    }catch(e){
      if(e?.name==='AbortError') return;
    }
  }
  downloadBlob(blob,filename);
}

export async function exportWord({date,data,tasks}){
  const filename=fileDate(date)+'工作日誌.docx';
  const doc=buildTemplateDoc({date,data,tasks});
  const blob=await Packer.toBlob(doc);
  await shareOrDownload(
    blob,
    filename,
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  );
  return {filename,blob,format:'docx'};
}
