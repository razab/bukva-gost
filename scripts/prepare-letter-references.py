"""Original local SVG word references; no network requests in the app."""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
source={p['id']:p for p in json.loads((ROOT/'references/picture-catalog-source.json').read_text())}
custom={
 'Э':'<rect x="25" y="40" width="150" height="106" rx="9" fill="#476b72"/><rect x="35" y="50" width="130" height="85" rx="3" fill="#a6d7d9"/><path d="M100 146V169M70 175H130" stroke="#476b72" stroke-width="10" stroke-linecap="round"/>',
 'И':'<path d="M157 30L45 171Q34 183 41 165L144 24Q160 8 157 30Z" fill="#a9bcc4" stroke="#476b72" stroke-width="3"/><path d="M147 30L135 46" stroke="white" stroke-width="4" stroke-linecap="round"/>',
 'Ы':'<rect x="35" y="65" width="130" height="88" rx="27" fill="#e3b5c3"/><ellipse cx="100" cy="101" rx="38" ry="18" fill="#f5d9e1"/><circle cx="47" cy="41" r="12" fill="#d9eced"/><circle cx="149" cy="42" r="19" fill="#d9eced"/>',
 'Н':'<path d="M45 29H82V106L111 128Q128 155 102 171Q83 181 67 161L45 129Z" fill="#d39c7d"/><path d="M105 30H142V94L170 116Q187 140 164 155Q143 167 126 147L105 120Z" fill="#8fb7aa"/><path d="M45 51H82M105 51H142" stroke="#fff4df" stroke-width="9"/>',
 'Ю':'<path d="M96 25H104V52H96Z" fill="#476b72"/><path d="M100 48Q145 60 163 116Q125 171 100 180Q75 171 37 116Q55 60 100 48Z" fill="#dfb15e"/><path d="M40 113H160M61 76H139M65 148H135" stroke="#b56451" stroke-width="10"/>',
 'Ь':'<circle cx="100" cy="100" r="69" fill="#d9ab69" stroke="#b2824d" stroke-width="4"/><g fill="#775647"><circle cx="68" cy="70" r="7"/><circle cx="115" cy="58" r="7"/><circle cx="91" cy="109" r="8"/><circle cx="137" cy="110" r="7"/><circle cx="64" cy="130" r="6"/><circle cx="112" cy="146" r="7"/></g>',
 'Т':'<path d="M38 103H162V166H38Z" fill="#ddb29d"/><path d="M38 118Q58 140 77 118Q100 140 122 118Q143 140 162 118V98H38Z" fill="#fff2d8"/><path d="M38 146H162" stroke="#ad6b63" stroke-width="9"/><path d="M76 96V64M124 96V64" stroke="#8fb7aa" stroke-width="9"/><path d="M76 36Q60 54 76 58Q92 54 76 36M124 36Q108 54 124 58Q140 54 124 36" fill="#e6b04c"/>',
 'Ф':'<path d="M62 49H138L126 100H74Z" fill="#476b72"/><path d="M74 100H126V171H74Z" fill="#dfb15e"/><ellipse cx="100" cy="48" rx="38" ry="13" fill="#9ed1d0"/><path d="M83 22V10M50 28L40 17M150 28L160 17" stroke="#dfb15e" stroke-width="5" stroke-linecap="round"/>',
 'Й':'<path d="M47 91Q31 53 57 55L68 76M151 77Q182 74 172 117Q162 145 143 119" fill="none" stroke="#8aaea1" stroke-width="12"/><path d="M48 82Q100 57 151 82L142 143Q100 172 57 143Z" fill="#a3c8b9"/><path d="M69 70Q100 47 132 70Z" fill="#72998a"/><circle cx="100" cy="53" r="8" fill="#dfb15e"/>',
 'Ш':'<circle cx="100" cy="89" r="61" fill="#dfa887"/><path d="M67 37Q24 89 67 141M133 37Q176 89 133 141M40 89H160" fill="none" stroke="#f8e6ca" stroke-width="8"/><path d="M100 150V179" stroke="#476b72" stroke-width="3"/>',
 'Щ':'<rect x="31" y="70" width="134" height="35" rx="15" fill="#d7ae6b"/><path d="M42 106V139M58 106V139M74 106V139M90 106V139M106 106V139M122 106V139M138 106V139M154 106V139" stroke="#7b9d90" stroke-width="8" stroke-linecap="round"/>',
 'Х':'<path d="M38 91Q24 48 58 40Q77 15 100 35Q133 15 149 42Q183 52 164 90V163H38Z" fill="#d8ac72"/><path d="M51 96Q39 60 64 54Q81 35 100 51Q125 35 142 55Q167 64 151 95V150H51Z" fill="#f4d5a0"/>',
 'Ъ':'<rect x="47" y="35" width="113" height="136" rx="7" fill="#f2dfb7" stroke="#8aaea1" stroke-width="4"/><circle cx="104" cy="32" r="10" fill="#b96958"/><path d="M68 70H140M68 92H140M68 114H128M68 143V161M86 143V161M104 143V161M122 143V161M140 143V161" stroke="#8aaea1" stroke-width="5"/>'
}
entries=[('А','арбуз',None),('У','улитка','snail'),('О','облако','rain-cloud'),('Э','экран',None),('И','игла',None),('Ы','мыло',None),('М','машина','car'),('Н','носки',None),('Л','лист','leaf'),('Р','ракета','rocket'),('Е','ель','fir'),('Ё','ёлка','fir'),('Я','яблоко','apple'),('Ю','юла',None),('Ь','печенье',None),('Г','гриб','mushroom'),('К','кот','cat'),('З','заяц','rabbit'),('С','солнце','sun'),('Д','дом','house'),('Т','торт',None),('В','велосипед','bicycle'),('Ф','фонарь',None),('Б','бабочка','butterfly'),('П','парусник','sailboat'),('Й','чайник',None),('Ж','жук','ladybug'),('Ш','шар',None),('Ч','чашка','cup'),('Щ','щётка',None),('Х','хлеб',None),('Ц','цветок','flower'),('Ъ','объявление',None)]
result={}
for letter,word,art in entries:
    assert letter in word.upper()
    if letter=='А':result[letter]={'word':word,'src':'assets/watermelon-reference.png'};continue
    if art:
        p=source['art-'+art]
        body=p['decor']+f'<path d="{p["fixed"]} {p["trace"]}" fill="none" stroke="#426d54" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>'
    else:body=custom[letter]
    filename=f'letter-{ord(letter):x}.svg'
    (ROOT/'concepts/assets/letter-references'/filename).write_text(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">{body}</svg>\n')
    result[letter]={'word':word,'src':'assets/letter-references/'+filename}
(ROOT/'concepts/components/letter-references.js').write_text('const LetterReferences='+json.dumps(result,ensure_ascii=False,separators=(',',':'))+';\n')
print('Saved',len(result),'word references')
