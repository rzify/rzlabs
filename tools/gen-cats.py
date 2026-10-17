"""Generate the cat and mark Astro components from one source of truth.

Run: python3 tools/gen-cats.py
Each cat SVG holds two poses (idle, react). Parts carry data-part attributes so
src/scripts/cats.ts can animate them. The `gap` class strokes take the colour of
the surface behind the cat (CSS var --cat-gap) so overlapping parts stay readable.
"""
import os

ROOT = os.path.join(os.path.dirname(__file__), '..', 'src', 'components')
HEAD = 'M20 40 L22 12 L42 28 Q50 26 58 28 L78 12 L80 40 Q86 49 86 58 Q86 88 50 88 Q14 88 14 58 Q14 49 20 40 Z'
C = dict(blue_fur='#FBF8F3', blue_points='#E0B98F', blue_eye='#6F8DB5', blue_line='#D3C8B8', blue_nose='#C98B7E',
         sp='#5E4C3B', sk='#1F1A16', belly='#8A7560', sp_eye='#B3A25C',
         zs='#707176', zp='#D4A88C', zpa='#B98F78', z_eye='#C2CB8C', zn='#3E3F43', ink='#26211D')

def pupils(kind, c):
    if kind == 'pause':
        return f'<rect x="35" y="48" width="8" height="22" rx="4" fill="{c}"/><rect x="57" y="48" width="8" height="22" rx="4" fill="{c}"/>'
    if kind == 'sleep':
        return (f'<path d="M32 57 Q39 64 46 57" fill="none" stroke="{c}" stroke-width="4" stroke-linecap="round"/>'
                f'<path d="M54 57 Q61 64 68 57" fill="none" stroke="{c}" stroke-width="4" stroke-linecap="round"/>')
    if kind == 'side':
        return (f'<rect x="29" y="54" width="8" height="16" rx="4" fill="{c}"/><rect x="51" y="54" width="8" height="16" rx="4" fill="{c}"/>'
                f'<rect x="26" y="52" width="16" height="4" rx="2" fill="{C["zn"]}"/><rect x="48" y="52" width="16" height="4" rx="2" fill="{C["zn"]}"/>')

def eyes(c, extra=''):
    # eyes: blink scales this group; pupils: follow-cursor translates this group
    return f'<g data-part="eyes" class="eyes"><g data-part="pupils">{pupils("pause", c)}</g></g>{extra}'

def head(name, mode='idle', gap=True):
    g = ' class="gap" stroke-width="2.5"' if gap else ''
    if name == 'blue':
        e = eyes(C['blue_eye']) if mode == 'idle' else pupils('sleep', C['blue_eye'])
        return (f'<path d="{HEAD}" fill="{C["blue_fur"]}" stroke="{C["blue_line"]}" stroke-width="1.5"/>'
                f'<polygon points="21,26 22,12 33,21" fill="{C["blue_points"]}"/><polygon points="67,21 78,12 79,26" fill="{C["blue_points"]}"/>'
                f'<ellipse cx="50" cy="77" rx="11" ry="7" fill="{C["blue_points"]}"/><polygon points="46,72 54,72 50,76" fill="{C["blue_nose"]}"/>{e}')
    if name == 'spooky':
        k = C['sk']
        return (f'<path d="{HEAD}" fill="{C["sp"]}"{g}/>'
                f'<polygon points="24,30 25,19 33,26" fill="{k}"/><polygon points="67,26 75,19 76,30" fill="{k}"/>'
                f'<rect x="43.5" y="30" width="3" height="12" rx="1.5" fill="{k}"/><rect x="48.5" y="28" width="3" height="14" rx="1.5" fill="{k}"/>'
                f'<rect x="53.5" y="30" width="3" height="12" rx="1.5" fill="{k}"/><rect x="15" y="60" width="13" height="3" rx="1.5" fill="{k}"/>'
                f'<rect x="72" y="60" width="13" height="3" rx="1.5" fill="{k}"/>' + eyes(C['sp_eye']))
    if name == 'zoe':
        side = f'<g data-part="side-eye" opacity="0">{pupils("side", C["z_eye"])}</g>'
        return (f'<path d="{HEAD}" fill="{C["zs"]}"{g}/>'
                f'<ellipse cx="50" cy="31" rx="5" ry="10" fill="{C["zp"]}"/><ellipse cx="69" cy="37" rx="8" ry="5" fill="{C["zp"]}"/>'
                f'<ellipse cx="28" cy="73" rx="6" ry="4" fill="{C["zpa"]}"/><polygon points="46,74 54,74 50,78" fill="{C["zn"]}"/>'
                + eyes(C['z_eye'], side))

STRIPES = ''.join(f'<rect x="{x}" y="116" width="10" height="{h}" rx="5" fill="{C["sk"]}"/>' for x, h in ((78,34),(104,27),(130,34),(156,27),(182,34)))

CATS = {
'blue': dict(label='Blue', idle=f'''
<path d="M100 188 C 62 194 48 170 60 148" fill="none" stroke="{C["blue_points"]}" stroke-width="12" stroke-linecap="round" data-part="tail"/>
<g data-part="body"><rect x="86" y="122" width="176" height="82" rx="41" fill="{C["blue_fur"]}"/><ellipse cx="142" cy="131" rx="42" ry="7" fill="#F1E3D0"/></g>
<rect x="200" y="188" width="28" height="18" rx="9" fill="{C["blue_fur"]}" stroke="{C["blue_line"]}" stroke-width="1.5"/><rect x="232" y="188" width="28" height="18" rx="9" fill="{C["blue_fur"]}" stroke="{C["blue_line"]}" stroke-width="1.5"/>
<g transform="translate(186 50) scale(0.92)"><g data-part="head">{head("blue")}</g></g>''',
react=f'''
<path d="M88 110 C 70 80 76 44 94 30 C 102 24 113 30 106 39" fill="none" stroke="{C["blue_points"]}" stroke-width="12" stroke-linecap="round" data-part="tail"/>
<rect x="98" y="118" width="20" height="88" rx="10" fill="{C["blue_fur"]}" stroke="{C["blue_line"]}" stroke-width="1.5"/><rect x="124" y="128" width="20" height="78" rx="10" fill="{C["blue_fur"]}" stroke="{C["blue_line"]}" stroke-width="1.5"/>
<rect x="80" y="128" width="180" height="72" rx="36" fill="{C["blue_fur"]}" transform="rotate(16 250 182)"/>
<g stroke="{C["ink"]}" stroke-width="3" stroke-linecap="round" data-part="marks"><path d="M66 88 L56 80"/><path d="M62 104 L50 104"/><path d="M66 120 L56 128"/></g>
<rect x="200" y="188" width="28" height="18" rx="9" fill="{C["blue_fur"]}" stroke="{C["blue_line"]}" stroke-width="1.5"/><rect x="232" y="188" width="28" height="18" rx="9" fill="{C["blue_fur"]}" stroke="{C["blue_line"]}" stroke-width="1.5"/>
<g transform="translate(190 62) scale(0.92)">{head("blue", "react")}</g>
<text x="292" y="48" text-anchor="end" class="purr">prrr</text>'''),
'spooky': dict(label='Spooky', idle=f'''
<g data-part="tail"><path d="M38 172 C 6 172 2 142 16 124" fill="none" stroke="{C["sp"]}" stroke-width="14" stroke-linecap="round"/><path d="M9 137 C 8 132 10 127 14 124" fill="none" stroke="{C["sk"]}" stroke-width="14" stroke-linecap="round"/></g>
<g data-part="body"><rect x="28" y="116" width="240" height="86" rx="43" fill="{C["sp"]}"/>{STRIPES}<rect x="48" y="176" width="40" height="7" rx="3.5" fill="{C["sk"]}"/></g>
<rect x="240" y="168" width="52" height="16" rx="8" fill="{C["sp"]}" class="gap" stroke-width="2"/><rect x="226" y="186" width="64" height="16" rx="8" fill="{C["sp"]}" class="gap" stroke-width="2"/>
<g transform="translate(186 28) scale(1.15)"><g data-part="head">{head("spooky")}</g></g>''',
react=f'''
<path d="M44 182 C 20 186 8 176 12 160" fill="none" stroke="{C["sp"]}" stroke-width="13" stroke-linecap="round"/>
<g data-part="legs">''' + ''.join(f'<rect x="{x}" y="{y}" width="17" height="{h}" rx="8.5" fill="{C["sp"]}" class="gap" stroke-width="2"/><rect x="{x}" y="{y}" width="17" height="8" rx="4" fill="{C["sk"]}"/>' for x, y, h in ((102,86,56),(128,80,60),(196,88,54),(222,82,58))) + f'''</g>
<rect x="36" y="128" width="240" height="74" rx="37" fill="{C["sp"]}"/><ellipse cx="164" cy="140" rx="86" ry="14" fill="{C["belly"]}"/>''' + ''.join(f'<rect x="{x}" y="{y}" width="10" height="{202-y}" rx="5" fill="{C["sk"]}"/>' for x, y in ((86,172),(112,178),(138,172),(164,178),(190,172))) + f'''
<g transform="translate(304 206) rotate(180)">{head("spooky")}</g>'''),
'zoe': dict(label='Zoe', idle=f'''
<path d="M236 192 C 276 194 286 166 268 150" fill="none" stroke="{C["zs"]}" stroke-width="13" stroke-linecap="round" data-part="tail"/>
<g data-part="body"><rect x="74" y="100" width="172" height="104" rx="52" fill="{C["zs"]}"/><ellipse cx="108" cy="152" rx="18" ry="12" fill="{C["zp"]}"/><ellipse cx="210" cy="128" rx="12" ry="9" fill="{C["zpa"]}"/><ellipse cx="204" cy="178" rx="10" ry="7" fill="{C["zp"]}"/></g>
<rect x="136" y="178" width="23" height="32" rx="11.5" fill="{C["zs"]}" class="gap" stroke-width="2"/><rect x="161" y="178" width="23" height="32" rx="11.5" fill="{C["zs"]}" class="gap" stroke-width="2"/><ellipse cx="172" cy="202" rx="7" ry="5" fill="{C["zp"]}"/>
<g transform="translate(110 16)"><g data-part="head">{head("zoe")}</g></g>''',
react=f'''
<rect x="74" y="100" width="172" height="104" rx="52" fill="{C["zs"]}"/><ellipse cx="128" cy="140" rx="22" ry="14" fill="{C["zp"]}"/><ellipse cx="200" cy="170" rx="14" ry="9" fill="{C["zpa"]}"/><rect x="157" y="106" width="6" height="90" rx="3" fill="#626368"/>
<g transform="translate(110 16)"><path d="{HEAD}" fill="{C["zs"]}" class="gap" stroke-width="2.5"/><ellipse cx="36" cy="40" rx="9" ry="6" fill="{C["zp"]}"/></g>
<path d="M84 196 C 120 214 200 214 244 192 C 256 186 258 174 250 170" fill="none" stroke="{C["zs"]}" stroke-width="13" stroke-linecap="round"/>
<path d="M84 196 C 92 200 100 203 108 205" fill="none" stroke="{C["zp"]}" stroke-width="13" stroke-linecap="round"/>
<text x="272" y="70" text-anchor="end" class="purr">hmph.</text>'''),
}

ACTIONS = {
 'blue': 'Pat Blue on the bum',
 'spooky': 'Wake Spooky up',
 'zoe': 'Poke Zoe (at your own risk)',
}

os.makedirs(os.path.join(ROOT, 'cats'), exist_ok=True)
for name, d in CATS.items():
    comp = f'''---
// Generated by tools/gen-cats.py. Edit the generator, not this file.
interface Props {{ class?: string }}
const {{ class: className = '' }} = Astro.props;
---
<button type="button" class={{`cat cat--{name} ${{className}}`}} data-cat="{name}" aria-label="{ACTIONS[name]}">
  <svg viewBox="0 0 320 220" aria-hidden="true" focusable="false">
    <g class="pose pose--idle" data-pose="idle">{d["idle"]}
    </g>
    <g class="pose pose--react" data-pose="react">{d["react"]}
    </g>
  </svg>
  <span class="cat__name">{d["label"]}</span>
</button>
'''
    open(os.path.join(ROOT, 'cats', f'{name.capitalize()}.astro'), 'w').write(comp)
print('ok')
