import React, {useEffect, useState} from 'react';
import {SafeAreaView, View, Text, TextInput, Pressable, ScrollView, StyleSheet, Alert} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY='chenbom_daily_reports_v1';
const today=()=>new Date().toISOString().slice(0,10);
const empty={author:'吳英德',morningTasks:'',afternoonTasks:'',taskDetailsMap:{},factoryDetails:[{id:Date.now(),title:'',content:''}],businessReply:''};
const items=s=>(s||'').split(/[\n,，、]+/).map(x=>x.trim()).filter(Boolean);
const excluded=['業務會議','工廠聯繫','開月會'];

export default function App(){
 const [date,setDate]=useState(today()); const [reports,setReports]=useState({}); const [data,setData]=useState(empty); const [ready,setReady]=useState(false);
 useEffect(()=>{(async()=>{try{const x=await AsyncStorage.getItem(KEY);const r=x?JSON.parse(x):{};setReports(r);setData(r[date]||empty);}finally{setReady(true)}})()},[]);
 useEffect(()=>{if(!ready)return; const t=setTimeout(async()=>{const r={...reports,[date]:data};setReports(r);await AsyncStorage.setItem(KEY,JSON.stringify(r));},500);return()=>clearTimeout(t)},[data,date,ready]);
 const set=(k,v)=>setData(d=>({...d,[k]:v}));
 const tasks=[...items(data.morningTasks),...items(data.afternoonTasks)].filter(x=>!excluded.includes(x));
 const addFactory=()=>set('factoryDetails',[...data.factoryDetails,{id:Date.now(),title:'',content:''}]);
 const updateFactory=(i,k,v)=>set('factoryDetails',data.factoryDetails.map((x,n)=>n===i?{...x,[k]:v}:x));
 const loadDate=v=>{setDate(v);setData(reports[v]||empty)};
 const clear=()=>Alert.alert('確認','清空本日內容？',[{text:'取消'},{text:'確定',onPress:()=>setData({...empty,author:data.author})}]);
 if(!ready)return <SafeAreaView style={s.center}><Text>☁️ 載入中...</Text></SafeAreaView>;
 return <SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.container}>
  <View style={s.header}><Text style={s.title}>承邦有限公司</Text><Text style={s.subtitle}>客服工作日報表</Text><Text style={s.cloud}>☁️ 已自動儲存</Text></View>
  <View style={s.card}><Text style={s.label}>選擇日期</Text><TextInput style={s.date} value={date} onChangeText={loadDate} placeholder="YYYY-MM-DD"/><Text style={s.label}>客服</Text><TextInput style={s.input} value={data.author} onChangeText={v=>set('author',v)}/></View>
  <Section title="上午 0830-1200"><TextInput multiline style={s.textarea} value={data.morningTasks} onChangeText={v=>set('morningTasks',v)} placeholder="輸入工作項目，一行一項"/></Section>
  <Section title="下午 1300-1730"><TextInput multiline style={s.textarea} value={data.afternoonTasks} onChangeText={v=>set('afternoonTasks',v)} placeholder="輸入工作項目，一行一項"/></Section>
  <Text style={s.sectionTitle}>工作細項</Text>
  {tasks.length===0?<Text style={s.empty}>輸入工作項目後會自動產生詳細說明</Text>:tasks.map((t,i)=><View style={s.row} key={t+i}><Text style={s.task}>{t}</Text><TextInput multiline style={s.textarea} value={data.taskDetailsMap[t]||''} onChangeText={v=>set('taskDetailsMap',{...data.taskDetailsMap,[t]:v})} placeholder="輸入詳細說明..."/></View>)}
  <Text style={s.sectionTitle}>工廠聯繫進度</Text>
  {data.factoryDetails.map((f,i)=><View style={s.row} key={f.id}><TextInput style={s.input} value={f.title} onChangeText={v=>updateFactory(i,'title',v)} placeholder="聯繫標題"/><TextInput multiline style={s.textarea} value={f.content} onChangeText={v=>updateFactory(i,'content',v)} placeholder="進度說明..."/><Pressable onPress={()=>set('factoryDetails',data.factoryDetails.filter((_,n)=>n!==i))} style={s.delete}><Text>刪除</Text></Pressable></View>)}
  <Pressable onPress={addFactory} style={s.add}><Text style={s.addText}>＋ 新增聯繫項目</Text></Pressable>
  <Text style={s.sectionTitle}>業務工廠回覆</Text><TextInput multiline style={s.bigarea} value={data.businessReply} onChangeText={v=>set('businessReply',v)} placeholder="輸入回覆事項..."/>
  <Pressable onPress={clear} style={s.clear}><Text style={s.clearText}>清空當日</Text></Pressable>
 </ScrollView></SafeAreaView>
}
function Section({title,children}){return <View style={s.card}><Text style={s.section}>{title}</Text>{children}</View>}
const s=StyleSheet.create({safe:{flex:1,backgroundColor:'#f3f4f6'},container:{padding:16,paddingBottom:60},center:{flex:1,alignItems:'center',justifyContent:'center'},header:{backgroundColor:'#111827',padding:20,borderRadius:18,marginBottom:12},title:{color:'#fff',fontSize:24,fontWeight:'800'},subtitle:{color:'#dbeafe',fontSize:18,marginTop:4},cloud:{color:'#86efac',marginTop:10},card:{backgroundColor:'#fff',padding:16,borderRadius:16,marginBottom:12,elevation:2},label:{fontWeight:'700',marginBottom:6,marginTop:6},date:{borderWidth:1,borderColor:'#2563eb',borderRadius:10,padding:12,fontSize:17,marginBottom:8},input:{borderWidth:1,borderColor:'#d1d5db',borderRadius:10,padding:12,fontSize:16,backgroundColor:'#fff'},textarea:{borderWidth:1,borderColor:'#d1d5db',borderRadius:10,padding:12,minHeight:90,textAlignVertical:'top',fontSize:16,marginTop:8,backgroundColor:'#fff'},bigarea:{borderWidth:1,borderColor:'#d1d5db',borderRadius:10,padding:12,minHeight:140,textAlignVertical:'top',fontSize:16},section:{fontSize:18,fontWeight:'800',color:'#1d4ed8',marginBottom:10},sectionTitle:{fontSize:20,fontWeight:'800',marginVertical:10,color:'#111827'},row:{backgroundColor:'#fff',padding:12,borderRadius:14,marginBottom:10},task:{fontWeight:'800',color:'#1e3a8a',fontSize:16},empty:{backgroundColor:'#fff',padding:20,borderRadius:12,color:'#9ca3af',textAlign:'center'},add:{backgroundColor:'#e5e7eb',padding:15,borderRadius:12,alignItems:'center',marginBottom:12},addText:{fontWeight:'700'},delete:{alignSelf:'flex-end',marginTop:8,padding:8,backgroundColor:'#fee2e2',borderRadius:8},clear:{backgroundColor:'#dc2626',padding:16,borderRadius:12,alignItems:'center',marginTop:12},clearText:{color:'#fff',fontWeight:'800'}});
