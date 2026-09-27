from pathlib import Path
import base64, binascii, re, struct, zlib, json

P=Path("qryby.html")
s=P.read_text(encoding="utf-8")
VALID_SPRITE="""iVBORw0KGgoAAAANSUhEUgAAAMAAAAA+CAMAAABKmuRcAAAAwFBMVEXg2KCg2Kf10ltdpaEhkZze7dERGSXjrFGWqp0hWGigXyrhmzGn4dAdbpBmza1YZV7Ttpde18cJIks1xLiimWPJcys1zMVdNB5qTS4ltMFlj3SWdVH6zS9KdYicvMOwiThkssTJeEC1yXc0QzU4jngAAAD699L6+u0EJ00MZ40JR3APdpb513AEFzEutrUFOWcCBhAHNVUKWIYWl6oKVXYTiKZw1rL46LJPyLP35o765nIoqbD59K8aprGxuKjpyae61nWZAAAAQHRSTlP/////////////////////////////////////////////////AP//////////////////////////////////ISbIRAAAEopJREFUeNrVWol2GzmSBFCo++IlSvLR3TO7rMJR932S//9Xm6AkS7Lkds/Y3tdd71lPNClWBpAZGZEodPo7XCYxn1+Q6T/5U3T6e1y3vx+eX9xNm38cgNPJ7V++SP55AE7kZSzR9M8DYJDl+cUNufnHATg58d0zGjP6rwDoOtKNXxpl+mdJ9CLznST+LwDYu35ZovhXAqj/jE3HF7RE4utKGv9pChnRmCSj97Pj3m697cNvIo5j7cU72uO9qu3WIbB2Zds+VIF7XciPfw2ApmlB8PDrbgQEkfZTw/e8KEKJp18xlAih2Ds1T2/ipx1vHTdygUILml/L+Bqb+RcAMF33PA8jPbbVlh0SuIj+88JvctveLsuSJKhXX6stI+qwX84PS+3jSGc5xEALl0wGL6amvT/ZhuNOyDktjgLzpwByb651jCOM8chPpW4REiXJ8pNzqFxG+NYEtwxIvuuSYSiaWlzfolhdXaANNyaJisJsuGiLsnBMglwTIryC+CaA6rF+EVrgayKjhOUnY7L87FIudYgf4cHrto1BB5Lt07Y+Ptwbd12A8VxL54ZM5u3veb5K0y5uXZf0ycn5118qYq1HIyDQTwiNqE+W5OciSGH9MZ6mYRiyrVbMdJ73kj9yEhNq/4lWF45LInN0jEK4EStu4eVkmsb3AZRetIwjbIEH5YBHHCWRAmCFPyN2O+yGDioXYgyCKVjnuV6b9kBbxn2outk2UtsucTBkszScG9NNxpE4Tl+yori7MaMb4y/tQL+M11zEHmwo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"""

def png_info(b64):
    raw=base64.b64decode(b64,validate=True)
    assert raw[:8]==b"\x89PNG\r\n\x1a\n"
    p=8; chunks=[]; idat=b""; w=h=ct=None
    while p+12<=len(raw):
        ln=struct.unpack(">I",raw[p:p+4])[0]
        typ=raw[p+4:p+8]
        data=raw[p+8:p+8+ln]
        crc=struct.unpack(">I",raw[p+8+ln:p+12+ln])[0]
        calc=binascii.crc32(typ+data)&0xffffffff
        if crc!=calc:
            raise AssertionError(f"bad CRC in {typ!r}")
        if typ==b"IHDR":
            w,h,bit,ct,comp,filt,inter=struct.unpack(">IIBBBBB",data)
            assert bit==8 and inter==0
        if typ==b"IDAT": idat+=data
        chunks.append(typ.decode("ascii"))
        p+=12+ln
        if typ==b"IEND": break
    assert chunks[-1]=="IEND"
    return {"w":w,"h":h,"color_type":ct,"bytes":len(raw),"chunks":chunks}

good=png_info(VALID_SPRITE)
assert good["w"]==192 and good["h"]==62

start=s.index("(function dodajSmokaZycia()")
end=s.index("})();",start)+4
block=s[start:end]
cur=re.search(r"src:\s*'data:image/png;base64,([^']+)'",block)
if not cur:
    raise SystemExit("dragon sprite not found")
bad_before=False
try:
    png_info(cur.group(1))
except Exception:
    bad_before=True

block2=re.sub(
    r"src:\s*'data:image/png;base64,[^']+'",
    "src: 'data:image/png;base64,"+VALID_SPRITE+"'",
    block,
    count=1
)
block2=re.sub(
    r"meta:\s*\{\s*w:\s*192,\s*h:\s*\d+\s*\}",
    "meta: { w: 192, h: 62 }",
    block2,
    count=1
)
if block2==block:
    raise SystemExit("dragon block unchanged")
s=s[:start]+block2+s[end:]

# Build marker only; no gameplay/mechanics changes.
s,n=re.subn(
    r"window\.QRYBY_BUILD = '[^']+';",
    "window.QRYBY_BUILD = '2026-09-27-life-dragon-render-fix-v1';",
    s,count=1
)
if n!=1:
    raise SystemExit("build marker not updated")

# Re-extract and validate exact embedded PNG after patch.
start2=s.index("(function dodajSmokaZycia()")
end2=s.index("})();",start2)+4
block_after=s[start2:end2]
aft=re.search(r"src:\s*'data:image/png;base64,([^']+)'",block_after)
assert aft
after=png_info(aft.group(1))
assert after["w"]==192 and after["h"]==62
assert "Scene.W * 0.225" in s
assert s.count("f.smokBierze = Math.random() < 0.50;")==1
assert "f.smokT / 2.20" in s

report={
  "stage":"SMOK_6A_RENDER_FIX",
  "bad_sprite_crc_before":bad_before,
  "after":after,
  "scale_22_5pct":True,
  "bite_50pct_unchanged":True,
  "movement_unchanged":True
}
Path("tests/smok-stage6a-render.json").write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding="utf-8")
P.write_text(s,encoding="utf-8")
print("SMOK_6A_RENDER_FIX_OK",report)
