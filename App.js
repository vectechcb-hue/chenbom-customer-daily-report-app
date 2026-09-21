import React, {useEffect, useMemo, useState} from 'react';
import {
  SafeAreaView, View, Text, TextInput, Pressable, ScrollView,
  StyleSheet, Alert, Platform
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {exportWord} from './wordExport';
import {
  loadCloudConfig, configureCloud, syncReport, loadReportsFromCloud,
  saveExportRecord, loadExportRecordsFromCloud, hasCloudConfig
} from './cloud';

const KEY='chenbom_daily_reports_v2';
const HISTORY_KEY='chenbom_word_export_history_v1';
const CONFIG_KEY='chenbom_firebase_config_v1';

const today=()=>new Date().toISOString().slice(0,10);
const makeEmpty=()=>({
  author:'吳英德',
  morningTasks:'',
  afternoonTasks:'',
  taskDetailsMap:{},
  factoryDetails:[{id:Date.now(),title:'',content:''}],
  businessReply:'',
  _updatedAt:Date.now()
});
const items=s=>(s||'').split(/[\n,，、]+/).map(x=>x.trim()).filter(Boolean);
const excluded=['業務會議','工廠聯繫','開月會'];

export default function App(){
  const [date,setDate]=useState(today());
  const [reports,setReports]=useState({});
  const [data,setData]=useState(makeEmpty());
  const [history,setHistory]=useState([]);
  const [historyQuery,setHistoryQuery]=useState('');
  const [cloudConfigText,setCloudConfigText]=useState('');
  const [cloudStatus,setCloudStatus]=useState('本機記憶');
  const [showHistory,setShowHistory]=useState(false);
  const [showCloud,setShowCloud]=useState(false);
  const [ready,setReady]=useState(false);

  useEffect(()=>{
    (async()=>{
      try{
        const raw=await AsyncStorage.getItem(KEY);
        const local=raw?JSON.parse(raw):{};
        const rawHistory=await AsyncStorage.getItem(HISTORY_KEY);
        const localHistory=rawHistory?JSON.parse(rawHistory):[];
        setReports(local);
        setData(local[date]||makeEmpty());
        setHistory(localHistory);
        const cfg=await loadCloudConfig();
        if(cfg){
          setCloudConfigText(JSON.stringify(cfg,null,2));
          try{
            await loadReportsFromCloud();
            setCloudStatus('☁️ 雲端已設定');
            const cloudReports=await loadReportsFromCloud();
            const merged={...local};
            for(const [d,v] of Object.entries(cloudReports)){
              const a=local[d]?._updatedAt||0;
              const b=v?._updatedAt||0;
              if(b>=a) merged[d]=v;
            }
            setReports(merged);
            setData(merged[date]||local[date]||makeEmpty());
            const cloudHistory=await loadExportRecordsFromCloud();
            if(cloudHistory.length){
              const all=[...cloudHistory,...localHistory];
              const map=new Map(all.map(x=>[String(x.id),x]));
              const mergedHistory=Array.from(map.values()).sort((a,b)=>(b.exportedAt||0)-(a.exportedAt||0));
              setHistory(mergedHistory);
              await AsyncStorage.setItem(HISTORY_KEY,JSON.stringify(mergedHistory));
            }
          }catch(err){
            setCloudStatus('⚠️ 雲端連線失敗（仍保留本機資料）');
          }
        }
      }finally{setReady(true);}
    })();
  },[]);

  useEffect(()=>{
    if(!ready)return;
    const next={...data,_updatedAt:Date.now()};
    const t=setTimeout(async()=>{
      const r={...reports,[date]:next};
      setReports(r);
      await AsyncStorage.setItem(KEY,JSON.stringify(r));
      try{
        if(await hasCloudConfig()){
          await syncReport(date,next);
          setCloudStatus('☁️ 已同步雲端');
        }
      }catch(_){
        setCloudStatus('⚠️ 雲端同步失敗（本機已儲存）');
      }
    },500);
    return()=>clearTimeout(t);
  },[data,date,ready]);

  const set=(k,v)=>setData(d=>({...d,[k]:v,_updatedAt:Date.now()}));
  const tasks=useMemo(()=>[...items(data.morningTasks),...items(data.afternoonTasks)].filter(x=>!excluded.includes(x)),[data.morningTasks,data.afternoonTasks]);

  const addFactory=()=>set('factoryDetails',[...(data.factoryDetails||[]),{id:Date.now(),title:'',content:''}]);
  const updateFactory=(i,k,v)=>set('factoryDetails',(data.factoryDetails||[]).map((x,n)=>n===i?{...x,[k]:v}:x));
  const loadDate=v=>{
    setDate(v);
    setData(reports[v]||makeEmpty());
  };
  const clear=()=>Alert.alert('確認','清空本日內容？',[
    {text:'取消'},
    {text:'確定',onPress:()=>setData({...makeEmpty(),author:data.author})}
  ]);

  const doExport=async(reportDate= date, reportData=data, fromHistory=false)=>{
    try{
      const report={...reportData};
      const reportTasks=[...items(report.morningTasks),...items(report.afternoonTasks)].filter(x=>!excluded.includes(x));
      const result=await exportWord({date:reportDate,data:report,tasks:reportTasks});
      const record={
        id:Date.now()+Math.floor(Math.random()*1000),
        date:reportDate,
        author:report.author||'',
        filename:result.filename,
        exportedAt:Date.now(),
        reportSnapshot:report,
        source:fromHistory?'history':'current'
      };
      const nextHistory=[record,...history].slice(0,200);
      setHistory(nextHistory);
      await AsyncStorage.setItem(HISTORY_KEY,JSON.stringify(nextHistory));
      try{
        await saveExportRecord(record);
        setCloudStatus('☁️ Word 匯出紀錄已同步');
      }catch(_){ }
      Alert.alert('完成',`已建立：\n${result.filename}\n\n匯出紀錄已保存，可在「匯出紀錄」查詢。`);
    }catch(err){
      if(err?.message) Alert.alert('匯出失敗',err.message);
    }
  };

  const connectCloud=async()=>{
    try{
      const cfg=JSON.parse(cloudConfigText);
      await configureCloud(cfg);
      const cloudReports=await loadReportsFromCloud();
      const cloudHistory=await loadExportRecordsFromCloud();
      const merged={...reports};
      for(const [d,v] of Object.entries(cloudReports)){
        const a=reports[d]?._updatedAt||0;
        const b=v?._updatedAt||0;
        if(b>=a) merged[d]=v;
      }
      setReports(merged);
      setData(merged[date]||data);
      const map=new Map([...history,...cloudHistory].map(x=>[String(x.id),x]));
      const mergedHistory=Array.from(map.values()).sort((a,b)=>(b.exportedAt||0)-(a.exportedAt||0));
      setHistory(mergedHistory);
      await AsyncStorage.setItem(HISTORY_KEY,JSON.stringify(mergedHistory));
      setCloudStatus('☁️ 雲端已連線');
      Alert.alert('成功','雲端記憶已連線，日報與 Word 匯出紀錄會同步保存。');
    }catch(err){
      setCloudStatus('⚠️ 設定失敗');
      Alert.alert('雲端設定失敗','請確認貼上的 Firebase Web 設定 JSON 是否完整，並確認已開啟匿名登入及 Firestore。');
    }
  };

  const refreshCloud=async()=>{
    try{
      const cloudReports=await loadReportsFromCloud();
      const merged={...reports,...cloudReports};
      setReports(merged);
      setData(merged[date]||data);
      const cloudHistory=await loadExportRecordsFromCloud();
      const map=new Map([...history,...cloudHistory].map(x=>[String(x.id),x]));
      const mergedHistory=Array.from(map.values()).sort((a,b)=>(b.exportedAt||0)-(a.exportedAt||0));
      setHistory(mergedHistory);
      await AsyncStorage.setItem(KEY,JSON.stringify(merged));
      await AsyncStorage.setItem(HISTORY_KEY,JSON.stringify(mergedHistory));
      setCloudStatus('☁️ 雲端資料已更新');
      Alert.alert('完成','已從雲端更新日報與匯出紀錄。');
    }catch(err){
      Alert.alert('同步失敗','請先設定 Firebase，或確認網路連線。');
    }
  };

  const filteredHistory=history.filter(h=>{
    const q=historyQuery.trim().toLowerCase();
    return !q || String(h.date).includes(q) || String(h.author||'').toLowerCase().includes(q) || String(h.filename||'').toLowerCase().includes(q);
  });

  if(!ready)return <SafeAreaView style={s.center}><Text style={s.loading}>載入中…</Text></SafeAreaView>;

  return <SafeAreaView style={s.safe}>
    <ScrollView contentContainerStyle={s.container}>
      <View style={s.header}>
        <Text style={s.title}>承邦有限公司</Text>
        <Text style={s.subtitle}>客服工作日報表</Text>
        <Text style={s.cloud}>{cloudStatus}</Text>
      </View>

      <View style={s.actionBar}>
        <Pressable style={s.primaryBtn} onPress={()=>doExport()}><Text style={s.btnText}>📄 匯出 Word</Text></Pressable>
        <Pressable style={s.secondaryBtn} onPress={()=>setShowHistory(v=>!v)}><Text style={s.secondaryText}>📚 匯出紀錄</Text></Pressable>
        <Pressable style={s.secondaryBtn} onPress={()=>setShowCloud(v=>!v)}><Text style={s.secondaryText}>☁️ 雲端記憶</Text></Pressable>
      </View>

      {showHistory&&<View style={s.card}>
        <Text style={s.section}>📚 Word 匯出紀錄</Text>
        <TextInput style={s.input} value={historyQuery} onChangeText={setHistoryQuery} placeholder="搜尋日期／客服／檔名"/>
        {filteredHistory.length===0?<Text style={s.empty}>目前沒有匯出紀錄。</Text>:filteredHistory.map(h=><View style={s.historyItem} key={String(h.id)}>
          <View style={{flex:1}}>
            <Text style={s.historyTitle}>{h.filename}</Text>
            <Text style={s.historyMeta}>{h.date}　{h.author}　{new Date(h.exportedAt).toLocaleString('zh-TW')}</Text>
          </View>
          <Pressable style={s.smallBtn} onPress={()=>{
            setDate(h.date);
            setData(h.reportSnapshot||makeEmpty());
            setShowHistory(false);
          }}><Text style={s.smallBtnText}>調出</Text></Pressable>
          <Pressable style={s.smallBtn} onPress={()=>doExport(h.date,h.reportSnapshot||makeEmpty(),true)}><Text style={s.smallBtnText}>重出 Word</Text></Pressable>
        </View>)}
      </View>}

      {showCloud&&<View style={s.card}>
        <Text style={s.section}>☁️ 雲端記憶設定</Text>
        <Text style={s.helper}>使用 Firebase 的免付費 Spark 方案即可做日報雲端記憶。把 Firebase Web App 的設定 JSON 貼在下方；之後日報與 Word 匯出紀錄會自動同步。</Text>
        <TextInput multiline style={s.configArea} value={cloudConfigText} onChangeText={setCloudConfigText} placeholder={'貼上 Firebase Web App 設定 JSON，例如：\n{"apiKey":"...","authDomain":"...","projectId":"...","appId":"..."}'}/>
        <View style={s.actionRow}>
          <Pressable style={s.primaryBtn} onPress={connectCloud}><Text style={s.btnText}>連線並同步</Text></Pressable>
          <Pressable style={s.secondaryBtn} onPress={refreshCloud}><Text style={s.secondaryText}>從雲端更新</Text></Pressable>
        </View>
        <Text style={s.tip}>Firebase 官方目前提供 Spark 免付費方案；Cloud Firestore 有免費配額，適合這種個人日報資料量。citeturn531600search1turn531600search10</Text>
      </View>}

      <View style={s.card}>
        <Text style={s.label}>選擇日期</Text>
        <TextInput style={s.date} value={date} onChangeText={loadDate} placeholder="YYYY-MM-DD"/>
        <Text style={s.label}>客服</Text>
        <TextInput style={s.input} value={data.author} onChangeText={v=>set('author',v)}/>
      </View>

      <Section title="上午 0830-1200">
        <TextInput multiline style={s.textarea} value={data.morningTasks} onChangeText={v=>set('morningTasks',v)} placeholder="輸入工作項目，一行一項"/>
      </Section>
      <Section title="下午 1300-1730">
        <TextInput multiline style={s.textarea} value={data.afternoonTasks} onChangeText={v=>set('afternoonTasks',v)} placeholder="輸入工作項目，一行一項"/>
      </Section>

      <Text style={s.sectionTitle}>工作細項</Text>
      {tasks.length===0?<Text style={s.empty}>輸入工作項目後會自動產生詳細說明</Text>:tasks.map((t,i)=><View style={s.row} key={t+i}>
        <Text style={s.task}>{t}</Text>
        <TextInput multiline style={s.textarea} value={data.taskDetailsMap?.[t]||''} onChangeText={v=>set('taskDetailsMap',{...data.taskDetailsMap,[t]:v})} placeholder="輸入詳細說明..."/>
      </View>)}

      <Text style={s.sectionTitle}>工廠聯繫進度</Text>
      {(data.factoryDetails||[]).map((f,i)=><View style={s.row} key={f.id}>
        <TextInput style={s.input} value={f.title} onChangeText={v=>updateFactory(i,'title',v)} placeholder="聯繫標題"/>
        <TextInput multiline style={s.textarea} value={f.content} onChangeText={v=>updateFactory(i,'content',v)} placeholder="進度說明..."/>
        <Pressable onPress={()=>set('factoryDetails',(data.factoryDetails||[]).filter((_,n)=>n!==i))} style={s.delete}><Text>刪除</Text></Pressable>
      </View>)}
      <Pressable onPress={addFactory} style={s.add}><Text style={s.addText}>＋ 新增聯繫項目</Text></Pressable>

      <Text style={s.sectionTitle}>業務工廠回覆</Text>
      <TextInput multiline style={s.bigarea} value={data.businessReply} onChangeText={v=>set('businessReply',v)} placeholder="輸入回覆事項..."/>

      <View style={s.bottomActions}>
        <Pressable onPress={()=>doExport()} style={s.primaryLarge}><Text style={s.btnText}>📄 匯出目前日報 Word</Text></Pressable>
        <Pressable onPress={clear} style={s.clear}><Text style={s.clearText}>清空當日</Text></Pressable>
      </View>
    </ScrollView>
  </SafeAreaView>;
}

function Section({title,children}){return <View style={s.card}><Text style={s.section}>{title}</Text>{children}</View>}

const s=StyleSheet.create({
  safe:{flex:1,backgroundColor:'#f3f4f6'},
  container:{padding:16,paddingBottom:60},
  center:{flex:1,alignItems:'center',justifyContent:'center',backgroundColor:'#f3f4f6'},
  loading:{fontSize:18,color:'#374151'},
  header:{backgroundColor:'#111827',padding:20,borderRadius:18,marginBottom:12},
  title:{color:'#fff',fontSize:24,fontWeight:'800'},
  subtitle:{color:'#dbeafe',fontSize:18,marginTop:4},
  cloud:{color:'#86efac',marginTop:10,fontWeight:'700'},
  actionBar:{flexDirection:'row',gap:8,marginBottom:12,flexWrap:'wrap'},
  actionRow:{flexDirection:'row',gap:8,marginTop:10,flexWrap:'wrap'},
  primaryBtn:{backgroundColor:'#2563eb',paddingVertical:12,paddingHorizontal:14,borderRadius:10,alignItems:'center'},
  primaryLarge:{backgroundColor:'#2563eb',padding:16,borderRadius:12,alignItems:'center',flex:1},
  secondaryBtn:{backgroundColor:'#e5e7eb',paddingVertical:12,paddingHorizontal:14,borderRadius:10,alignItems:'center'},
  btnText:{color:'#fff',fontWeight:'800'},
  secondaryText:{color:'#111827',fontWeight:'800'},
  card:{backgroundColor:'#fff',padding:16,borderRadius:16,marginBottom:12,elevation:2},
  label:{fontWeight:'700',marginBottom:6,marginTop:6},
  date:{borderWidth:1,borderColor:'#2563eb',borderRadius:10,padding:12,fontSize:17,marginBottom:8},
  input:{borderWidth:1,borderColor:'#d1d5db',borderRadius:10,padding:12,fontSize:16,backgroundColor:'#fff'},
  textarea:{borderWidth:1,borderColor:'#d1d5db',borderRadius:10,padding:12,minHeight:90,textAlignVertical:'top',fontSize:16,marginTop:8,backgroundColor:'#fff'},
  bigarea:{borderWidth:1,borderColor:'#d1d5db',borderRadius:10,padding:12,minHeight:140,textAlignVertical:'top',fontSize:16},
  configArea:{borderWidth:1,borderColor:'#9ca3af',borderRadius:10,padding:12,minHeight:180,textAlignVertical:'top',fontSize:14,fontFamily:Platform.OS==='web'?'monospace':undefined},
  section:{fontSize:18,fontWeight:'800',color:'#1d4ed8',marginBottom:10},
  sectionTitle:{fontSize:20,fontWeight:'800',marginVertical:10,color:'#111827'},
  row:{backgroundColor:'#fff',padding:12,borderRadius:14,marginBottom:10},
  task:{fontWeight:'800',color:'#1e3a8a',fontSize:16},
  empty:{backgroundColor:'#fff',padding:20,borderRadius:12,color:'#9ca3af',textAlign:'center'},
  add:{backgroundColor:'#e5e7eb',padding:15,borderRadius:12,alignItems:'center',marginBottom:12},
  addText:{fontWeight:'700'},
  delete:{alignSelf:'flex-end',marginTop:8,padding:8,backgroundColor:'#fee2e2',borderRadius:8},
  bottomActions:{flexDirection:'row',gap:10,alignItems:'center',marginTop:12},
  clear:{backgroundColor:'#dc2626',padding:16,borderRadius:12,alignItems:'center'},
  clearText:{color:'#fff',fontWeight:'800'},
  helper:{color:'#4b5563',lineHeight:20,marginBottom:10},
  tip:{color:'#6b7280',fontSize:12,marginTop:10,lineHeight:18},
  historyItem:{flexDirection:'row',alignItems:'center',gap:8,borderTopWidth:1,borderTopColor:'#e5e7eb',paddingVertical:10},
  historyTitle:{fontWeight:'800',color:'#111827'},
  historyMeta:{color:'#6b7280',fontSize:12,marginTop:3},
  smallBtn:{backgroundColor:'#eff6ff',borderRadius:8,paddingVertical:8,paddingHorizontal:9},
  smallBtnText:{color:'#1d4ed8',fontWeight:'800',fontSize:12}
});
