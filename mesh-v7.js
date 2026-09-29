(() => {
const gl=document.querySelector('#sea').getContext('webgl2',{antialias:true});if(!gl)return;
function program(v,f){function compile(kind,src){let s=gl.createShader(kind);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s}let p=gl.createProgram();gl.attachShader(p,compile(gl.VERTEX_SHADER,v));gl.attachShader(p,compile(gl.FRAGMENT_SHADER,f));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));return p}
const background=program(`#version 300 es
in vec2 p;out vec2 uv;void main(){uv=p*.5+.5;gl_Position=vec4(p,0.,1.);}`,`#version 300 es
precision highp float;in vec2 uv;out vec4 outColor;uniform float uTime;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
void main(){float h=.65;vec3 c;
if(uv.y>h){c=mix(vec3(.78,.87,.92),vec3(.28,.54,.76),pow(smoothstep(h,1.,uv.y),.7));}
else{c=mix(vec3(.50,.47,.42),vec3(.10,.24,.27),smoothstep(0.,h,uv.y));}
outColor=vec4(c,1.);}`);
const waveFunctions=`
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
float cycOf(float t){return floor((t+1.)/6.6);}
float segTau(float x,float t){float c=cycOf(t);float sf=x/2.3;float id=floor(sf);float f=fract(sf);f=f*f*(3.-2.*f);float a=hash(vec2(id,c+.13)),b=hash(vec2(id+1.,c+.13));return fract((t+1.)/6.6+(mix(a,b,f)-.5)*.72);}
float segAmp(float x,float t){float c=cycOf(t);float sf=x/2.3;float id=floor(sf);float f=fract(sf);f=f*f*(3.-2.*f);float a=hash(vec2(id*1.71+4.7,c)),b=hash(vec2((id+1.)*1.71+4.7,c));return .62+.65*mix(a,b,f);}
float waveFront(float x,float t){float p=segTau(x,t);return 7.6-4.6*p+.34*sin(x*.55+t*.16)+.16*sin(x*1.49-t*.27);}
float waveHeight(float x,float z,float t){
  float tau=segTau(x,t);float amp=segAmp(x,t);float w=waveFront(x,t);
  float steep=smoothstep(.12,.40,tau);
  float wid=mix(mix(.72,.42,steep),.95,step(w,z));
  float d=(z-w)/wid;
  float breakFade=1.-smoothstep(.55,.85,tau);
  float crest=(.16+.15*steep)*amp*exp(-d*d)*breakFade;
  float since=smoothstep(.5,.72,tau)*(1.-smoothstep(.90,1.,tau));
  float boreShift=2.3*smoothstep(.5,1.,tau);
  float bore=.16*amp*since*exp(-pow((z-(w-boreShift))/1.15,2.));
  float swell=.10*sin(z*1.02-t*1.02+x*.05)+.055*sin(z*2.0-t*1.75-x*.13)+.03*sin(z*4.1-t*2.6+x*.43);
  return max(-.02,crest+bore+swell);
}`;
const surface=program(`#version 300 es
precision highp float;in vec2 grid;out vec4 state;uniform float uTime,uAspect;
${waveFunctions}
void main(){float z=.10+75.*grid.y*grid.y;float x=(grid.x-.5)*2.*(z+1.15)*.73*uAspect;float height=waveHeight(x,z,uTime);float sx=.5+x/((z+1.15)*1.46*uAspect),sy=.65-.78*(1.-.6*height)/(z+1.15);gl_Position=vec4(sx*2.-1.,sy*2.-1.,0.,1.);state=vec4(x,z,height,uTime);}`,`#version 300 es
precision highp float;in vec4 state;out vec4 outColor;uniform sampler2D foamTex;
${waveFunctions}
void main(){float x=state.x,z=state.y,t=state.w,h=state.z;float near=clamp(1.-z/45.,0.,1.);
float dx=waveHeight(x+.06,z,t)-waveHeight(x-.06,z,t);float dz=waveHeight(x,z+.06,t)-waveHeight(x,z-.06,t);
vec3 N=normalize(vec3(-dx*6.,1.,-dz*6.));
float chopA=noise(vec2(x*3.1+t*.9,z*6.3-t*1.2))-.5;float chopB=noise(vec2(x*2.7-t*.7,z*5.1+t*1.5))-.5;
N=normalize(N+vec3(chopA*.5,0.,chopB*.5)*smoothstep(2.,8.,z));
vec3 base=mix(vec3(.15,.28,.30),vec3(.24,.38,.37),near);
float face=clamp(-dz*9.,0.,1.);base=mix(base,vec3(.25,.42,.38),face*.6*near);
float light=clamp(dot(N,normalize(vec3(-.18,.72,-.66))),0.,1.);base*=.58+.48*light;
base+=vec3(.34,.40,.42)*pow(1.-max(0.,N.y),2.)*.6;
base=mix(base,vec3(.46,.59,.65),smoothstep(8.,34.,z)*.55);
float tau=segTau(x,t);float amp=segAmp(x,t);float w=waveFront(x,t);
float lane=exp(-pow((x/(z+1.15))/.42,2.));
float sp=pow(max(0.,noise(vec2(x*7.+t*1.4,z*16.-t*3.))-.30),8.)*130.;
base+=vec3(.95,.90,.78)*sp*lane*smoothstep(1.2,4.,z);
float sp2=pow(max(0.,noise(vec2(x*23.-t*3.1,z*47.+t*6.))-.45),11.)*60.;
base+=vec3(.90,.87,.75)*sp2*(1.-smoothstep(.4,6.5,z));
float ageFoam=texture(foamTex,vec2(clamp((x+12.)/24.,0.,1.),clamp(z/13.,0.,1.))).r;
float net1=noise(vec2(x*3.4+t*.15,z*10.-t*.4));float net2=noise(vec2(x*9.-t*.5,z*27.+t*.8));
float net3=noise(vec2(x*5.5-t*.3,z*3.4-t*.55));
float net=net1*.55+net2*.25+net3*.20;
float lace=smoothstep(.36,.46,net)*(1.-smoothstep(.58,.74,net));
float lace2=smoothstep(.42,.52,net2*.7+net3*.3)*(1.-smoothstep(.62,.78,net2*.7+net3*.3));
lace=max(lace,lace2*.85);
float d=(z-w)/.9;
float cap=smoothstep(.26,.44,tau)*(1.-smoothstep(.55,.78,tau))*exp(-d*d);
float fw=smoothstep(.06,.28,ageFoam);float foam=fw*(.02+1.5*lace)*smoothstep(.02,.25,ageFoam)*1.4+ageFoam*.10+cap*.45*amp;
float sandF=1.-smoothstep(.30,1.15,z);
base=mix(base,vec3(.50,.48,.43)*(.55+.25*light),sandF*.8);
base+=vec3(.90,.87,.75)*sp2*sandF*.8;
vec3 foamCol=vec3(.92,.92,.89)*(.80+.20*noise(vec2(x*18.-t*2.,z*38.+t*3.)));base=mix(base,foamCol,clamp(foam*1.25,0.,.85));
outColor=vec4(base,1.);}`);
const crumble=program(`#version 300 es
precision highp float;in vec2 grid;out vec4 state;uniform float uTime,uAspect;
${waveFunctions}
void main(){float t=uTime;float x=(grid.x-.5)*2.*8.2*uAspect;
float tau=segTau(x,t);float amp=segAmp(x,t);float front=waveFront(x,t);float cyc=cycOf(t);
float crumb=smoothstep(.30,.52,tau)*(1.-smoothstep(.88,1.,tau));
float v=grid.y;
float cl=noise(vec2(x*1.25,cyc*3.7));
float churn=noise(vec2(x*4.2+t*2.6,v*7.-t*3.4));
float boreShift=2.3*smoothstep(.5,1.,tau);
float z=front+(1.-v)*(.8+.2*churn)-boreShift*.85-.35*crumb*v;
float hh=(.03+.17*pow(v,1.5))*amp;
hh*=.25+1.35*smoothstep(.35,.8,cl);
hh+=(churn-.5)*.08*amp;
float h=max(.0,hh*crumb+waveHeight(x,z,t)*.55);
float sx=.5+x/((z+1.15)*1.46*uAspect),sy=.65-.78*(1.-.6*h)/(z+1.15);
gl_Position=vec4(sx*2.-1.,sy*2.-1.,-.03,1.);state=vec4(x,z,v,cl);}`,`#version 300 es
precision highp float;in vec4 state;out vec4 outColor;uniform float uTime;
${waveFunctions}
void main(){float x=state.x,z=state.y,v=state.z,cl=state.w;float t=uTime;
float tau=segTau(x,t);
float crumb=smoothstep(.30,.52,tau)*(1.-smoothstep(.88,1.,tau));
float n=noise(vec2(x*4.2+t*1.1,v*9.-t*1.6));
float n2=noise(vec2(x*10.-t*1.7,v*26.+t*2.2));
float g3=noise(vec2(x*22.-t*3.,v*40.+t*5.));
vec3 col=mix(vec3(.70,.72,.68),vec3(.88,.87,.84),n*.7+n2*.3);
col*=.80+.20*g3;
col=mix(vec3(.22,.34,.31),col,smoothstep(.12,.5,v));
float a=crumb*(.20+.50*smoothstep(.42,.72,cl));
a*=smoothstep(.03,.18,v)*(1.-smoothstep(.90,1.,v));
a*=.40+.60*smoothstep(.32,.72,n2*.6+g3*.4);
outColor=vec4(col,a);}`);
const advect=program(`#version 300 es
in vec2 p;out vec2 uv;void main(){uv=p*.5+.5;gl_Position=vec4(p,0.,1.);}`,`#version 300 es
precision highp float;in vec2 uv;out vec4 outColor;uniform sampler2D prior;uniform float uTime,dt;
${waveFunctions}
void main(){
  float x=uv.x*24.-12.,z=uv.y*13.;float t=uTime;
  float tau=segTau(x,t);float front=waveFront(x,t);
  float boreShift=2.3*smoothstep(.5,1.,tau);
  float impact=smoothstep(.30,.52,tau)*(1.-smoothstep(.85,1.,tau));
  float speed=.85+.30*noise(vec2(x*.36,z*.33+t*.13));
  speed+=2.4*exp(-pow((z-(front-boreShift))/2.2,2.))*impact;
  float lateral=(noise(vec2(x*.64+t*.22,z*.8-t*.19))-.5)*.55;
  vec2 backward=clamp(uv+vec2(-lateral/24.,speed/13.)*dt,vec2(.001),vec2(.999));
  float old=texture(prior,backward).r;
  float ragged=(noise(vec2(x*2.1,t*.13))-.5)*1.1;float source=exp(-pow((z-(front-boreShift*.7+.4+ragged))/1.15,2.))*impact;
  float pattern=noise(vec2(x*2.7+t*.27,z*7.-t*.9));
  float deposit=source*(.45+.55*smoothstep(.2,.55,pattern));
  float foam=max(old*exp(-dt*(.07+.09*smoothstep(1.,6.,z))),deposit);
  outColor=vec4(foam,foam,foam,1.);
}`);
const tex=[],fbo=[],TW=384,TH=256;
for(let i=0;i<2;i++){let v=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,v);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA8,TW,TH,0,gl.RGBA,gl.UNSIGNED_BYTE,null);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);let f=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,f);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,v,0);gl.clearColor(0,0,0,1);gl.clear(gl.COLOR_BUFFER_BIT);tex.push(v);fbo.push(f)}gl.bindFramebuffer(gl.FRAMEBUFFER,null);
let foamIndex=0,previous=0,accumulator=0;
let square=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,square);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
function grid(nx,ny){let v=[];for(let j=ny-1;j>=0;j--)for(let i=0;i<nx;i++){let a=i/nx,b=(i+1)/nx,c=j/ny,d=(j+1)/ny;v.push(a,c,b,c,a,d,b,c,b,d,a,d)}let buff=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buff);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(v),gl.STATIC_DRAW);return {buff,count:v.length/2}}
let ocean=grid(200,180),breaker=grid(230,16),start=performance.now(),freeze=new URLSearchParams(location.search).get('time');gl.disable(gl.DEPTH_TEST);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
function draw(){let ratio=Math.min(devicePixelRatio||1,1.25),c=gl.canvas,w=Math.round(innerWidth*ratio),h=Math.round(innerHeight*ratio);if(c.width!==w||c.height!==h){c.width=w;c.height=h}gl.viewport(0,0,w,h);let t=freeze!==null?Number(freeze):(performance.now()-start)/1000;
let tick=Math.min(.12,Math.max(0,(performance.now()-start)/1000-previous));previous=(performance.now()-start)/1000;accumulator+=tick;
if(accumulator>.045){let dt=Math.min(.10,accumulator);accumulator=0;gl.bindFramebuffer(gl.FRAMEBUFFER,fbo[1-foamIndex]);gl.viewport(0,0,TW,TH);gl.useProgram(advect);gl.bindBuffer(gl.ARRAY_BUFFER,square);let q=gl.getAttribLocation(advect,'p');gl.enableVertexAttribArray(q);gl.vertexAttribPointer(q,2,gl.FLOAT,false,0,0);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,tex[foamIndex]);gl.uniform1i(gl.getUniformLocation(advect,'prior'),0);gl.uniform1f(gl.getUniformLocation(advect,'uTime'),t);gl.uniform1f(gl.getUniformLocation(advect,'dt'),dt);gl.disable(gl.BLEND);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);gl.enable(gl.BLEND);foamIndex=1-foamIndex;gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,w,h)}
function render(prog,b,attr,n){gl.useProgram(prog);gl.bindBuffer(gl.ARRAY_BUFFER,b);let loc=gl.getAttribLocation(prog,attr);gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);let time=gl.getUniformLocation(prog,'uTime');if(time)gl.uniform1f(time,t);let aspect=gl.getUniformLocation(prog,'uAspect');if(aspect)gl.uniform1f(aspect,w/h);gl.drawArrays(prog===background?gl.TRIANGLE_STRIP:gl.TRIANGLES,0,n)}render(background,square,'p',4);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,tex[foamIndex]);gl.useProgram(surface);gl.uniform1i(gl.getUniformLocation(surface,'foamTex'),0);render(surface,ocean.buff,'grid',ocean.count);render(crumble,breaker.buff,'grid',breaker.count);requestAnimationFrame(draw)}requestAnimationFrame(draw);
})();
