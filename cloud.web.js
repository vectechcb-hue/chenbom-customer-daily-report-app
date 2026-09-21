import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeApp, getApps, getApp, deleteApp } from 'firebase/app';
import { getAuth, signInAnonymously, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, getDocs, query, orderBy, limit, deleteDoc } from 'firebase/firestore';

const CONFIG_KEY='chenbom_firebase_config_v1';
let appInstance=null, authInstance=null, dbInstance=null, currentUid=null, currentConfigKey=null;

function cleanConfig(input){
  if(typeof input === 'string'){
    const parsed=JSON.parse(input);
    input=parsed?.firebaseConfig || parsed;
  }
  const required=['apiKey','authDomain','projectId','appId'];
  for(const key of required){
    if(!input?.[key]) throw new Error('Firebase 設定缺少 '+key);
  }
  return input;
}

async function init(config){
  const cfg=cleanConfig(config);
  const nextKey=JSON.stringify(cfg);
  if(!appInstance || currentConfigKey!==nextKey){
    if(appInstance){ try{ await deleteApp(appInstance); }catch(_){} }
    appInstance=initializeApp(cfg);
    currentConfigKey=nextKey;
    authInstance=getAuth(appInstance);
    dbInstance=getFirestore(appInstance);
    try{ await setPersistence(authInstance,browserLocalPersistence); }catch(_){}
  }
  if(!authInstance.currentUser) await signInAnonymously(authInstance);
  currentUid=authInstance.currentUser.uid;
  return {uid:currentUid};
}

export async function loadCloudConfig(){
  const raw=await AsyncStorage.getItem(CONFIG_KEY);
  return raw?JSON.parse(raw):null;
}

export async function configureCloud(config){
  const cfg=cleanConfig(config);
  await AsyncStorage.setItem(CONFIG_KEY,JSON.stringify(cfg));
  return init(cfg);
}

export async function syncReport(date,data){
  const cfg=await loadCloudConfig();
  if(!cfg) throw new Error('尚未設定 Firebase');
  await init(cfg);
  await setDoc(doc(dbInstance,'users',currentUid,'daily_reports',date),{...data,_updatedAt:Date.now(),_date:date});
}

export async function loadReportsFromCloud(){
  const cfg=await loadCloudConfig();
  if(!cfg) return {};
  await init(cfg);
  const snap=await getDocs(collection(dbInstance,'users',currentUid,'daily_reports'));
  const out={};
  snap.forEach(d=>{
    const v=d.data();
    delete v._date;
    out[d.id]=v;
  });
  return out;
}

export async function saveExportRecord(record){
  const cfg=await loadCloudConfig();
  if(!cfg) throw new Error('尚未設定 Firebase');
  await init(cfg);
  await setDoc(doc(dbInstance,'users',currentUid,'export_history',String(record.id)),record);
}

export async function deleteExportRecord(id){
  const cfg=await loadCloudConfig();
  if(!cfg) return false;
  await init(cfg);
  await deleteDoc(doc(dbInstance,'users',currentUid,'export_history',String(id)));
  return true;
}

export async function loadExportRecordsFromCloud(){
  const cfg=await loadCloudConfig();
  if(!cfg) return [];
  await init(cfg);
  const q=query(collection(dbInstance,'users',currentUid,'export_history'),orderBy('exportedAt','desc'),limit(200));
  const snap=await getDocs(q);
  return snap.docs.map(d=>d.data());
}

export async function hasCloudConfig(){ return Boolean(await loadCloudConfig()); }
