/* Straight scissors cut, applied to unfolded tail faces before hinge rotations. */
const cutDialog=$('#cutDialog'),cutSvg=$('#cutCanvas');
let pendingCut=null,cutStart=null,cutValid=false;
const cutScreen=(u,v,side)=>[320+side*(20+u*240),290-v*200];
function cutArea(poly){return Math.abs(poly.reduce((a,p,i)=>{const q=poly[(i+1)%poly.length];return a+p[0]*q[2]-q[0]*p[2]},0)/2)}
function cutCandidate(){return {...params,cuts:[...validCuts(params.cuts),pendingCut].filter(Boolean)}}
function assessCut(){
 if(!pendingCut)return '已剪裁 '+validCuts(params.cuts).length+' 次，可在当前轮廓上继续画线剪裁。';

 const sides=pendingCut.side===0?[-1,1]:[pendingCut.side];let removed=0;
 for(const side of sides){const before=tailPolygon(params,side),after=tailPolygon(cutCandidate(),side),full=tailPolygon({...params,cuts:[]},side);if(tailConnection(cutCandidate(),side)<.15)return '剪线会切断翼尾连接，请保留一小段前缘连接。';const area=cutArea(after);removed+=cutArea(before)-area;if(after.length<3||area<cutArea(full)*.15)return '这条线剪掉太多，请至少保留 15% 的翼尾面积。'}
 if(removed<.0001)return '虚线没有剪到剩余翼尾，请重新画一条穿过边缘的线。';
 cutValid=true;return '预览已就绪：红色部分将剪掉，点击确认后更新三维飞机。';
}
function renderCut(){
 cutValid=false;$('#cutStatus').textContent=assessCut();$('#confirmCut').disabled=!cutValid;$('#cutUndo').disabled=!undo.length;$('#cutRedo').disabled=!redo.length;
 const L=2.45-params.nose*.0045,B=.68+params.wing*.006,tail=-L*.53;
 const elements=['<text x="320" y="25" text-anchor="middle" fill="var(--canvas-ink)" font-size="12">↑ 机头方向 / 翼尾放大</text>'];
 const polygon=(poly,side,color)=>'<polygon points="'+poly.map(v=>cutScreen(side*v[2]/B,(v[0]-tail)/.36,side).join(',')).join(' ')+'" fill="'+color+'" stroke="var(--violet)" stroke-width="1.5"/>';
 for(const side of [-1,1]){
  elements.push(polygon(tailPolygon(params,side),side,pendingCut&&cutValid?'var(--cut-remove)':'var(--cut-keep)'));
  if(pendingCut&&cutValid)elements.push(polygon(tailPolygon(cutCandidate(),side),side,'var(--cut-keep)'));
  const segment=tailConnectionRange(params,side);const a=cutScreen(.89*segment[0],.75+.25*segment[0],side),b=cutScreen(.89*segment[1],.75+.25*segment[1],side);
  elements.push('<path d="M '+a.join(' ')+' L '+b.join(' ')+'" stroke="var(--teal)" stroke-width="3"/>');
  elements.push('<text x="'+(320+side*145)+'" y="320" text-anchor="middle" fill="var(--canvas-ink)" font-size="12">'+(side===-1?'左翼尾':'右翼尾')+'</text>');
  if(pendingCut&&(pendingCut.side===0||pendingCut.side===side)){
   const [a,b,c]=pendingCut.line,den=a*a+b*b,cx=-a*c/den,cy=-b*c/den,dx=-b/Math.sqrt(den)*2,dy=a/Math.sqrt(den)*2;
   const start=cutScreen(cx-dx,cy-dy,side),end=cutScreen(cx+dx,cy+dy,side);
   elements.push('<line x1="'+start[0]+'" y1="'+start[1]+'" x2="'+end[0]+'" y2="'+end[1]+'" stroke="'+(cutValid?'var(--cut-line)':'var(--muted)')+'" stroke-width="2" stroke-dasharray="7 6"/>');
  }
 }
 cutSvg.innerHTML=elements.join('');
}
function clearPending(){pendingCut=null;cutStart=null;renderCut()}
$('#openCut').onclick=()=>{clearPending();cutDialog.showModal()};
$('#closeCut').onclick=()=>cutDialog.close();
$('#cutSide').onchange=()=>{if(pendingCut)pendingCut={...pendingCut,side:Number($('#cutSide').value)};renderCut()};
$('#exampleCut').onclick=()=>{for(let c=.45;c>=-.4;c-=.04){pendingCut={side:Number($('#cutSide').value),line:[-1,1,c]};cutValid=false;assessCut();if(cutValid)break}renderCut()};
$('#cutUndo').onclick=()=>{$('#undo').onclick();clearPending()};
$('#cutRedo').onclick=()=>{$('#redo').onclick();clearPending()};
$('#cancelLine').onclick=clearPending;
$('#clearCuts').onclick=()=>{if(!params.cuts?.length){clearPending();return}remember();params={...params,cuts:[]};clearPending();sync();persist();toast('已恢复完整翼尾，可撤销')};
$('#confirmCut').onclick=()=>{if(!cutValid||!pendingCut)return;remember();params=cutCandidate();sync();persist();clearPending();toast('已剪掉，可直接画下一条剪线')};
function cutPosition(e){const point=cutSvg.createSVGPoint();point.x=e.clientX;point.y=e.clientY;return point.matrixTransform(cutSvg.getScreenCTM().inverse())}
cutSvg.onpointerdown=e=>{const q=cutPosition(e);cutStart={side:q.x<320?-1:1,u:(Math.abs(q.x-320)-20)/240,v:(290-q.y)/200};pendingCut=null;renderCut();cutSvg.setPointerCapture(e.pointerId)};
cutSvg.onpointermove=e=>{if(!cutStart)return;const q=cutPosition(e),u=(cutStart.side*(q.x-320)-20)/240,v=(290-q.y)/200,du=u-cutStart.u,dv=v-cutStart.v;
 if(Math.hypot(du,dv)<.04)return;
 let line=[-dv,du,dv*cutStart.u-du*cutStart.v];if(line[0]*.445+line[1]*.875+line[2]<0)line=line.map(n=>-n);
 pendingCut={side:Number($('#cutSide').value),line};renderCut()};
cutSvg.onpointerup=()=>{cutStart=null};cutSvg.onpointercancel=()=>{cutStart=null;clearPending()};
