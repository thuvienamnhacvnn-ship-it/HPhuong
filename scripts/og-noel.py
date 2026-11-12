"""Share card (link preview) 1200x630: deep coffee background + Christmas decor around the logo."""
import math, random
from PIL import Image, ImageDraw, ImageFilter
S=2; W,H=1200*S,630*S
random.seed(7)
# coffee radial gradient
bg=Image.new("RGB",(W,H),(38,22,14)); px=bg.load()
cx,cy=W/2,H*0.46
for y in range(0,H):
    for x in range(0,W,2):
        d=min(1,math.hypot((x-cx)/(W*0.62),(y-cy)/(H*0.85)))
        c=(int(86-52*d),int(52-32*d),int(36-22*d))
        px[x,y]=c
        if x+1<W: px[x+1,y]=c
im=bg.convert("RGBA")
def layer(): return Image.new("RGBA",(W,H),(0,0,0,0))
# logo
logo=Image.open("assets/brand/logo-full-new.png").convert("RGBA")
lh=int(H*0.80); lw=int(logo.width*lh/logo.height); logo=logo.resize((lw,lh),Image.LANCZOS)
glow=layer(); g=Image.new("RGBA",(lw,lh),(255,200,110,0)); 
a=logo.split()[3].filter(ImageFilter.GaussianBlur(26)).point(lambda v:int(v*0.35)); g.putalpha(a)
glow.paste(g,((W-lw)//2,int(H*0.10))); im=Image.alpha_composite(im,glow)
im.alpha_composite(logo,((W-lw)//2,int(H*0.10)))
# pine branch
def branch(x0,y0,ang,length,flip):
    L=layer(); d=ImageDraw.Draw(L)
    ex=x0+math.cos(ang)*length; ey=y0+math.sin(ang)*length
    d.line([x0,y0,ex,ey],fill=(70,44,24,255),width=int(5*S))
    n=int(length/(9*S))
    for i in range(n):
        t=(i+1)/n; bx=x0+(ex-x0)*t; by=y0+(ey-y0)*t
        ln=(1-t*0.55)*44*S
        for sgn in(-1,1):
            a2=ang+sgn*math.radians(58)
            nx,ny=bx+math.cos(a2)*ln,by+math.sin(a2)*ln
            col=random.choice([(30,86,52),(38,104,62),(24,70,44)])
            d.line([bx,by,nx,ny],fill=col+(255,),width=int(5.5*S))
            for k in(.45,.75):
                mx,my=bx+(nx-bx)*k,by+(ny-by)*k
                for s2 in(-1,1):
                    a3=a2+s2*math.radians(38); l3=ln*.38
                    d.line([mx,my,mx+math.cos(a3)*l3,my+math.sin(a3)*l3],fill=col+(255,),width=int(3*S))
    # berries & baubles
    for i in range(5):
        t=.2+i*.17; bx=x0+(ex-x0)*t+random.uniform(-6,6)*S; by=y0+(ey-y0)*t+random.uniform(-8,8)*S
        r=random.choice([7,8,9])*S
        d.ellipse([bx-r,by-r,bx+r,by+r],fill=(176,30,38,255))
        d.ellipse([bx-r*.5,by-r*.6,bx-r*.1,by-r*.2],fill=(255,170,170,200))
    return L
for (x0,y0,ang) in [(-10*S,50*S,math.radians(20)),(W+10*S,50*S,math.radians(160)),(-10*S,H-60*S,math.radians(-18)),(W+10*S,H-60*S,math.radians(198))]:
    im=Image.alpha_composite(im,branch(x0,y0,ang,int(W*0.30),0))
# fairy lights along the top
L=layer(); d=ImageDraw.Draw(L)
pts=[]
for i in range(0,41):
    x=W*i/40; y=18*S+math.sin(i/40*math.pi*4)*0+ (28*S)*math.sin(i/40*math.pi)*math.cos(i*1.0)*0 + 22*S*abs(math.sin(i/40*math.pi*5))
    pts.append((x,y))
d.line(pts,fill=(90,60,40,255),width=int(2*S))
cols=[(255,214,120),(255,120,110),(150,230,170),(255,214,120)]
gl=layer(); gd=ImageDraw.Draw(gl)
for i,(x,y) in enumerate(pts[1:-1:2]):
    c=cols[i%4]; r=6*S
    gd.ellipse([x-r*2.4,y+4*S-r*2.4,x+r*2.4,y+4*S+r*2.4],fill=c+(90,))
    d.ellipse([x-r*.6,y+4*S,x+r*.6,y+4*S+r*1.6],fill=(70,50,30,255))
    d.ellipse([x-r*.9,y+4*S+r*1.2,x+r*.9,y+4*S+r*3.2],fill=c+(255,))
gl=gl.filter(ImageFilter.GaussianBlur(10)); im=Image.alpha_composite(im,gl); im=Image.alpha_composite(im,L)
# stars + snow
def star(d,x,y,r,col):
    pts=[]
    for k in range(8):
        rr=r if k%2==0 else r*.28; a=math.pi/4*k-math.pi/2
        pts.append((x+math.cos(a)*rr,y+math.sin(a)*rr))
    d.polygon(pts,fill=col)
L=layer(); d=ImageDraw.Draw(L)
for x,y,r in [(0.10,0.30,14),(0.90,0.28,16),(0.16,0.66,10),(0.84,0.64,11),(0.27,0.14,9),(0.73,0.15,9)]:
    star(d,W*x,H*y,r*S,(255,226,150,235))
for _ in range(110):
    x,y=random.uniform(0,W),random.uniform(0,H); r=random.choice([1.5,2,2.5,3.5])*S
    d.ellipse([x-r,y-r,x+r,y+r],fill=(255,255,255,random.randint(110,225)))
im=Image.alpha_composite(im,L.filter(ImageFilter.GaussianBlur(.6)))
im=im.convert("RGB").resize((1200,630),Image.LANCZOS)
im.save("public/og-image.png",optimize=True)
