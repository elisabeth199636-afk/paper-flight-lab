/* Parameterized 3D mesh, perspective projection, depth-sorted faces and directional lighting.
   Geometry is illustrative; changing the view never changes flight physics. */
const orbit={yaw:-.62,pitch:.57,zoom:1};
function rotateAtFold(point,a,b,angle){
 const u=b.map((x,i)=>x-a[i]),len=Math.hypot(...u);for(let i=0;i<3;i++)u[i]/=len;
 const v=point.map((x,i)=>x-a[i]),co=Math.cos(angle),si=Math.sin(angle),dot=u.reduce((sum,x,i)=>sum+x*v[i],0),cross=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
 return v.map((x,i)=>a[i]+x*co+cross[i]*si+u[i]*dot*(1-co));
}
// Cut lines use normalized, unfolded tail coordinates (span, longitudinal position).
function validCuts(cuts){return Array.isArray(cuts)?cuts.filter(c=>[-1,0,1].includes(c.side)&&Array.isArray(c.line)&&c.line.length===3&&c.line.every(Number.isFinite)&&Math.hypot(c.line[0],c.line[1])>1e-8):[]}
// Remaining connected interval of the original leading fold (t = 0..1).
function tailConnectionRange(p,side){let lo=0,hi=1;for(const cut of validCuts(p.cuts)){if(cut.side!==0&&cut.side!==side)continue;const [a,b,c]=cut.line,d0=b*.75+c,slope=a*.89+b*.25;if(Math.abs(slope)<1e-10){if(d0<0)return [0,0]}else if(slope>0)lo=Math.max(lo,-d0/slope);else hi=Math.min(hi,-d0/slope)}return [Math.min(1,Math.max(0,lo)),Math.min(1,Math.max(0,hi))]}
function tailConnection(p,side){const [lo,hi]=tailConnectionRange(p,side);return Math.max(0,hi-lo)}
function clipTail(poly,line,side,B,tail){
 const d=v=>line[0]*side*v[2]/B+line[1]*(v[0]-tail)/.36+line[2];
 const out=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],da=d(a),db=d(b);if(da>=-1e-9)out.push(a);if((da>=0)!==(db>=0)){const t=da/(da-db);out.push(a.map((v,j)=>v+t*(b[j]-v)))}}return out;
}
function tailPolygon(p,side){const L=2.45-p.nose*.0045,B=.68+p.wing*.006,tail=-L*.53,up=p.trim*.012;
 let poly=[[tail+.36,.15,side*B*.89],[tail+.15,.13+up,side*B],[tail+.06,.04+up,0],[tail+.27,.06,0]];
 for(const cut of validCuts(p.cuts))if(cut.side===0||cut.side===side)poly=clipTail(poly,cut.line,side,B,tail);return poly;
}
function buildPlaneMesh(p){
 const L=2.45-p.nose*.0045,B=.68+p.wing*.006,tail=-L*.53,nose=L*.65,up=p.trim*.012;
 const N=[nose,.08,0],C=[tail,.02,0],K=[tail,.02-L*1.18*(p.body??12)/100,0];
 const faces=[],folds=[],roots=[];
 for(const side of [-1,1]){
  const fold=[tail+.27,.06,0],outer=[tail+.36,.15,side*B*.89],tailTip=[tail+.15,.13+up,side*B],tailInner=[tail+.06,.04+up,0];
  const open=-side*(p.opening??0)*Math.PI/360,wingAngle=side*(p.dihedral??0)*Math.PI/180;
  const bodyRotate=v=>rotateAtFold(v,N,K,open),wingRotate=v=>bodyRotate(rotateAtFold(v,N,fold,wingAngle));
  const addBody=(v,color)=>faces.push({v:v.map(bodyRotate),color});
  const addWing=(v,color,edge=false)=>{if(v.length>=3)faces.push({v:v.map(wingRotate),color,...(edge?{edge:true}:{})})};
  const wing=[N,outer,fold],flap=tailPolygon(p,side);
  addWing(wing,side===1?[191,149,233]:[159,112,211]);addWing(flap,[143,87,199]);addBody([N,fold,C],[123,70,180]);addBody([N,C,K],[105,59,168]);
  folds.push([bodyRotate(N),bodyRotate(fold)]);roots.push(bodyRotate(fold));
  for(const poly of [wing,flap]){const bottom=poly.map(a=>[a[0],a[1]-.012,a[2]]);addWing(bottom,[159,112,211]);for(let i=0;i<poly.length;i++)addWing([poly[i],poly[(i+1)%poly.length],bottom[(i+1)%poly.length],bottom[i]],[85,42,142],true)}
 }
 return {faces,folds,rootGap:Math.hypot(...roots[0].map((v,i)=>v-roots[1][i])),length:L*1.18};
}
function drawPlane3D(ctx,w,h,p){
 const {faces}=buildPlaneMesh(p);
 const cy=Math.cos(orbit.yaw),sy=Math.sin(orbit.yaw),cp=Math.cos(orbit.pitch),sp=Math.sin(orbit.pitch);
 function rotate(v){const x=v[0]*cy+v[2]*sy,z=-v[0]*sy+v[2]*cy;return [x,v[1]*cp-z*sp,v[1]*sp+z*cp]}
 const size=Math.min(w*.22,h*.40)*orbit.zoom;
 function project(a){const f=5/(5-a[2]);return [w*.5+a[0]*size*f,h*.49-a[1]*size*f]}
 ctx.save();ctx.fillStyle='#faf9ee';ctx.fillRect(0,0,w,h);
 ctx.save();ctx.translate(w*.5,h*.77);ctx.scale(1,.22);ctx.fillStyle='#f6e4c7';ctx.beginPath();ctx.arc(0,0,size*1.15,0,Math.PI*2);ctx.fill();ctx.restore();
 // Keep the geometry, but omit thin rim faces that read like a drawn outline.
 const prepared=faces.filter(f=>!f.edge).map(f=>({...f,pts:f.v.map(rotate)})).sort((a,b)=>a.pts.reduce((s,v)=>s+v[2],0)/a.pts.length-b.pts.reduce((s,v)=>s+v[2],0)/b.pts.length);
 for(const f of prepared){const [a,b,c]=f.pts,u=b.map((n,i)=>n-a[i]),v=c.map((n,i)=>n-a[i]);let normal=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];const len=Math.hypot(...normal)||1;normal=normal.map(x=>x/len);if(normal[2]<0)normal=normal.map(x=>-x);const light=.73+.27*Math.max(0,normal[0]*-.35+normal[1]*.75+normal[2]*.56);ctx.fillStyle='rgb('+f.color.map(x=>Math.round(x*light)).join(',')+')';ctx.beginPath();f.pts.forEach((a,i)=>{const xy=project(a);i?ctx.lineTo(...xy):ctx.moveTo(...xy)});ctx.closePath();ctx.fill()}
 // Small orientation compass, derived from the same 3D camera transform.
 const ox=35,oy=h-65;for(const [v,label,color]of [[[.25,0,0],'X','#993d1b'],[[0,.25,0],'Y','#006b57'],[[0,0,.25],'Z','#61349c']]){const q=rotate(v);ctx.strokeStyle=color;ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(ox,oy);ctx.lineTo(ox+q[0]*65,oy-q[1]*65);ctx.stroke();ctx.font='9px monospace';ctx.fillText(label,ox+q[0]*80-3,oy-q[1]*80+3)}ctx.restore();
}

if(typeof module!=="undefined")module.exports={tailConnection,tailConnectionRange,rotateAtFold,buildPlaneMesh,validCuts,clipTail,tailPolygon};
