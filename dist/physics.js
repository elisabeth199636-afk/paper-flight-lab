/* Deterministic, deliberately simplified rigid glider model. SI units. */
function simulate(p){
 const dt=1/120,m=.00499,g=9.81,rho=1.225,area=.012+p.wing*.00012,span=.13+p.wing*.0012,AR=span*span/area;
 let x=0,y=1.65,vx=8.2,vy=.85,theta=.10,omega=0,t=0,max=1.65,stalls=0;
 const points=[{x,y,t,theta}], cg=(p.nose-45)/100,trim=p.trim*Math.PI/180;
 for(let k=0;k<3600;k++){
  const speed=Math.hypot(vx,vy),gamma=Math.atan2(vy,vx),alpha=Math.atan2(Math.sin(theta-gamma),Math.cos(theta-gamma));
  let cl=3.1*alpha+.11;if(Math.abs(alpha)>.28){cl=Math.sign(alpha)*.95*Math.exp(-(Math.abs(alpha)-.28)*2.5);stalls++}
  const cd=.038+.012*Math.abs(cg)+cl*cl/(Math.PI*AR*.78)+.5*Math.max(0,Math.abs(alpha)-.28);
  const q=.5*rho*speed*speed*area,L=q*cl,D=q*cd;
  const ax=(-D*Math.cos(gamma)-L*Math.sin(gamma))/m,ay=(L*Math.cos(gamma)-D*Math.sin(gamma))/m-g;
  const target=.06+trim*1.8-cg*.075;
  omega+=((target-alpha)*(8+speed*.7)-omega*3.7)*dt;theta+=omega*dt;
  vx+=ax*dt;vy+=ay*dt;const old={x,y,t,theta};x+=vx*dt;y+=vy*dt;t+=dt;max=Math.max(max,y);
  if(!Number.isFinite(x+y+theta))return null;
  if(y<=0){const a=old.y/(old.y-y);x=old.x+(x-old.x)*a;t=old.t+dt*a;points.push({x,y:0,t,theta});return {distance:x,time:t,height:max,points,stalls,params:{...p},model:1}}
  if(k%4===0)points.push({x,y,t,theta});
 }
 return null;
}
if(typeof module!=='undefined')module.exports={simulate};
