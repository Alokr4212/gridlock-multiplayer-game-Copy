import React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { ArrowLeft, Check, Copy, Crown, LoaderCircle, RotateCcw, Share2, Sparkles, Users, Wifi } from 'lucide-react';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = url && key ? createClient(url, key) : null;
const LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
const outcome = board => {
  for (const line of LINES) { const [a,b,c] = line; if (board[a] && board[a] === board[b] && board[a] === board[c]) return {winner:board[a],line}; }
  return board.every(Boolean) ? {winner:'draw',line:[]} : null;
};
const roomCode = () => Array.from({length:6},()=> 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random()*32)]).join('');
function playerIdentity() { let id=sessionStorage.getItem('gridlock-player-id'); if(!id){id=crypto.randomUUID();sessionStorage.setItem('gridlock-player-id',id);} return id; }

export default function App() {
  const playerId = useMemo(playerIdentity, []);
  const [room,setRoom]=useState(null), [seat,setSeat]=useState(null);
  const [code,setCode]=useState(new URLSearchParams(location.search).get('room')?.toUpperCase()||'');
  const [name,setName]=useState(''), [busy,setBusy]=useState(false), [notice,setNotice]=useState('');
  const [copied,setCopied]=useState(false), [online,setOnline]=useState(false);
  const syncRoom=useCallback(async c=>{
    if(!supabase||!c)return;
    const {data,error}=await supabase.from('ttt_rooms').select('*').eq('code',c).maybeSingle();
    if(error){setNotice(error.message);return;}
    if(data){setRoom(data);if(data.player_x===playerId)setSeat('X');else if(data.player_o===playerId)setSeat('O');}
  },[playerId]);
  useEffect(()=>{
    if(!room?.code||!supabase)return;
    const channel=supabase.channel('room-'+room.code)
      .on('postgres_changes',{event:'*',schema:'public',table:'ttt_rooms',filter:'code=eq.'+room.code},p=>{if(p.new){setRoom(p.new);if(p.new.player_x===playerId)setSeat('X');else if(p.new.player_o===playerId)setSeat('O');}})
      .subscribe(s=>{setOnline(s==='SUBSCRIBED');if(s==='SUBSCRIBED')syncRoom(room.code);});
    const poll=setInterval(()=>syncRoom(room.code),2500);
    return()=>{clearInterval(poll);supabase.removeChannel(channel);};
  },[room?.code,playerId,syncRoom]);
  const createRoom=async()=>{
    if(!supabase){setNotice('Supabase credentials are missing in Vercel.');return;}
    setBusy(true);setNotice('');
    try{
      const c=roomCode();
      const {data,error}=await supabase.from('ttt_rooms').insert({code:c,board:Array(9).fill(null),turn:'X',status:'waiting',player_x:playerId,player_x_name:name.trim()||'Player X'}).select().single();
      if(error)throw error;setRoom(data);setSeat('X');history.replaceState({},'','?room='+c);
    }catch(e){setNotice(e.message||'Could not create room.');}finally{setBusy(false);}
  };
  const joinRoom=async()=>{
    if(!supabase){setNotice('Supabase credentials are missing in Vercel.');return;}
    const c=code.trim().toUpperCase();if(!c){setNotice('Enter a room code.');return;}
    setBusy(true);setNotice('');
    try{
      const {data,error}=await supabase.from('ttt_rooms').select('*').eq('code',c).maybeSingle();
      if(error)throw error;if(!data)throw new Error('Room not found.');
      if(data.player_x===playerId){setRoom(data);setSeat('X');}
      else if(data.player_o===playerId){setRoom(data);setSeat('O');}
      else if(!data.player_o){
        const r=await supabase.from('ttt_rooms').update({player_o:playerId,player_o_name:name.trim()||'Player O',status:'playing'}).eq('code',c).is('player_o',null).select().maybeSingle();
        if(r.error)throw r.error;if(!r.data)throw new Error('This room was just taken. Try again.');
        setRoom(r.data);setSeat('O');
      }else throw new Error('This room already has two players.');
      history.replaceState({},'','?room='+c);
    }catch(e){setNotice(e.message||'Could not join room.');}finally{setBusy(false);}
  };
  const play=async i=>{
    if(!room||!seat||room.status!=='playing'||room.turn!==seat||room.board[i]||outcome(room.board))return;
    const board=[...room.board];board[i]=seat;const result=outcome(board);
    const {error}=await supabase.from('ttt_rooms').update({board,turn:seat==='X'?'O':'X',status:result?'finished':'playing',winner:result?.winner??null,winning_line:result?.line??[]}).eq('code',room.code).eq('turn',seat).eq('status','playing');
    if(error)setNotice(error.message);await syncRoom(room.code);
  };
  const rematch=async()=>{
    setBusy(true);try{const {error}=await supabase.from('ttt_rooms').update({board:Array(9).fill(null),turn:'X',status:room.player_o?'playing':'waiting',winner:null,winning_line:[]}).eq('code',room.code);if(error)throw error;await syncRoom(room.code);}catch(e){setNotice(e.message);}finally{setBusy(false);}
  };
  const invite=location.origin+location.pathname+'?room='+(room?.code||'');
  const copy=async()=>{try{await navigator.clipboard.writeText(invite);setCopied(true);setTimeout(()=>setCopied(false),1600);}catch{setNotice('Copy this invite link: '+invite);}};
  const result=room?outcome(room.board):null;
  const myTurn=room?.status==='playing'&&room.turn===seat;
  if(!supabase)return <main className="setup"><div className="panel"><Sparkles/><p className="eyebrow">GRIDLOCK</p><h1>One more move.</h1><p>Supabase credentials are not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Vercel Environment Variables, then redeploy.</p></div></main>;
  return <main className="shell">
    <header><a className="brand" href="/" onClick={e=>{e.preventDefault();setRoom(null);setSeat(null);history.replaceState({},'','/');}}>✦ gridlock<span>.</span></a><small className={online?'online':''}><i/> {online?'LIVE SYNC':'CONNECTING'}</small></header>
    {!room?<section className="home"><div><p className="eyebrow">THE CLASSIC, CONNECTED</p><h1>One grid.<br/>Two minds<span>.</span></h1><p className="muted">Challenge a friend from anywhere, one move at a time.</p><div className="mini"> <b>X</b><i></i><b>O</b><i></i><b>X</b><i></i><b>O</b><i></i><b>X</b></div><small>NO DOWNLOADS. JUST GOOD MOVES.</small></div>
      <div className="panel"><div className="panel-title"><Crown/><div><h2>Ready to play?</h2><p>Set your name, then make a move.</p></div></div><label>YOUR DISPLAY NAME (OPTIONAL)</label><input value={name} maxLength={20} onChange={e=>setName(e.target.value)} placeholder="e.g. Alex"/><button className="primary" disabled={busy} onClick={createRoom}>{busy?<LoaderCircle className="spin"/>:<Users/>} Create a new room</button><div className="or">OR JOIN A FRIEND</div><label>ROOM CODE</label><div className="join"><input value={code} maxLength={6} onChange={e=>setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,''))} placeholder="ABC123"/><button onClick={joinRoom} disabled={busy}>Join room</button></div>{notice&&<p className="error">{notice}</p>}</div></section>:
      <section className="game"><button className="back" onClick={()=>{setRoom(null);setSeat(null);history.replaceState({},'','/');}}><ArrowLeft size={16}/> Back to lobby</button><p className="eyebrow center">PRIVATE MATCH</p><h1 className="center">Make your <span>move.</span></h1><div className="panel"><div className="roomhead"><div><label>ROOM CODE</label><strong>{room.code}</strong></div><button className="secondary" onClick={copy}>{copied?<Check/>:<Share2/>} {copied?'Copied':'Invite'}</button></div><div className="players"><div><b className="x">X</b><strong>{room.player_x_name||'Player X'}</strong><small>{seat==='X'?'YOU':'PLAYER 1'}</small></div><em>VS</em><div><b className="o">O</b><strong>{room.player_o_name||'Waiting…'}</strong><small>{seat==='O'?'YOU':room.player_o?'PLAYER 2':'INVITE A FRIEND'}</small></div></div><div className="status">{room.status==='waiting'?'Waiting for a friend to join…':result?.winner==='draw'?'It is a draw!':result?.winner?result.winner===seat?'You win!':'Your opponent wins!':myTurn?'Your turn — make your move':'Waiting for your opponent…'}</div><div className="board">{room.board.map((v,i)=><button key={i} disabled={!myTurn||!!v||room.status!=='playing'} className={(v==='X'?'x ':v==='O'?'o ':'')+(room.winning_line?.includes(i)?'winning':'')} onClick={()=>play(i)}>{v}</button>)}</div>{room.status==='waiting'&&<p className="muted">Share the invite link or room code with your friend.</p>}{room.status==='finished'&&<button className="primary" onClick={rematch} disabled={busy}><RotateCcw/> Play again</button>}{notice&&<p className="error">{notice}</p>}</div></section>}
    <footer>GRIDLOCK © 2026 <span>BUILT FOR FRIENDLY COMPETITION ♥</span></footer>
  </main>;
}