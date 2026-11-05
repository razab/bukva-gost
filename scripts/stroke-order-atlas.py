"""Source-backed stroke-order index. Never changes app glyphs or teaching paths."""
from pathlib import Path
import json,hashlib,argparse
from PIL import Image
from reportlab.platypus import SimpleDocTemplate,Paragraph,Table,TableStyle,Spacer,PageBreak,Image as PDFImage,KeepTogether
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib import colors
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from pypdf import PdfReader
from xml.sax.saxutils import escape

ROOT=Path(__file__).resolve().parents[1];BASE=ROOT/'references/stroke-order';OUT=ROOT/'output/pdf/gost-stroke-order-atlas.pdf'
parser=argparse.ArgumentParser();parser.add_argument('--canary',action='store_true');args=parser.parse_args()
URL='https://lensktekhnikum.ru/sveden/files/rip/OP.02_MRPR_Texnicheskaya_grafika_MSR-22.pdf#page=36'
OSU='https://elib.osu.ru/bitstream/123456789/10355/1/%D0%9A%D0%B0%D0%BF%D0%B8%D1%86%D0%B0.pdf#page=7'
TPU='https://portal.tpu.ru/SHARED/a/ASOT/students/Tab/nacher_geom_zachita.pdf#page=123'
UTAH='https://uurc.utah.edu/general/letterformation.php#o'
upper={};lower={}
def group(target,letters,bounds,y,group_no):
 for c,(a,b) in zip(letters,zip(bounds,bounds[1:])):target[c]={'box':[a,y[0],b,y[1]],'group':group_no}
group(upper,'ГЕНПТЦШЩ',[49,108,162,220,281,332,389,465,536],(0,103),1)
group(upper,'АЖИЙКМХ',[49,119,207,268,327,393,466,536],(105,211),2)
upper['К']['box']=[333,117,394,201]
group(upper,'ДЛУЧ',[49,116,178,249,315],(222,325),3)
group(upper,'ОСФЭЮ',[49,111,167,238,300,377],(337,432),4)
group(upper,'БВЗРЪЫЬЯ',[49,113,177,226,281,347,411,475,536],(438,536),5)
group(lower,'абвдег',[113,166,228,281,337,394,447],(0,88),1)
group(lower,'йпцтшщ',[109,169,226,282,349,423,503],(104,191),2)
assert len(upper)==32 and len(lower)==12
images=[Image.open(BASE/'excerpts'/f'lensk-technical-graphics-figure-{i}.png').convert('RGB') for i in [0,1]]
cropdir=BASE/'letters';cropdir.mkdir(exist_ok=True)
for registry,img in [(upper,images[0]),(lower,images[1])]:
 for c,info in registry.items():
  p=cropdir/f'{ord(c):04x}.png';img.crop(info['box']).save(p);info['image']=str(p.relative_to(ROOT));info['source_url']=URL
current=json.loads((ROOT/'reports/stroke-order-2026-11-03/current-routes.json').read_text());current={r['character']:r for r in current}
def moves(c):
 paths=current[c]['demonstration'];return 1+sum(((a[-1][0]-b[0][0])**2+(a[-1][1]-b[0][1])**2)**.5>.01 for a,b in zip(paths,paths[1:]))
def evidence(c):
 if c in upper:return {'type':'direct','figure':5,**upper[c],'note':'Рис. 5, группа '+str(upper[c]['group'])}
 if c in lower:return {'type':'direct','figure':6,**lower[c],'note':'Рис. 6, группа '+str(lower[c]['group'])}
 if c in 'Ёё':
  base='Е' if c=='Ё' else 'е';e=evidence(base);return {**e,'type':'diacritic','base':base,'note':'Схема '+base+' + две точки; адаптация.'}
 if c=='и':return {**evidence('й'),'type':'diacritic','base':'й','note':'Схема й без верхней черты; адаптация.'}
 assert c.islower() and c.upper() in upper,c
 return {**evidence(c.upper()),'type':'analogy','base':c.upper(),'note':'Схема '+c.upper()+'; пропорции и вынос - строчные.'}
rows=[]
for c in 'АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ':rows.append({'letter':c,'upper':evidence(c),'lower':evidence(c.lower()),'current_moves':[moves(c),moves(c.lower())]})
index={'schema':1,'date':'2026-11-03','reviewed_build':'2026-11-03.28','scope':'33 uppercase/lowercase pairs, source diagrams and explicit adaptations; source diagrams are inclined, app uses upright GOST. These are instructional recommendations, not a claim that GOST mandates pen order.','sources':[{'id':'LENSK','url':URL,'title':'Ленский технологический техникум. Техническая графика, 2022','page':36,'figures':[5,6],'local':'references/stroke-order/sources/lensk-technical-graphics.pdf'},{'id':'OSU','url':OSU,'title':'Капица, Саблина. Оформление чертежей, ОГУ, 2013','pages':[7,8],'figures':[1],'local':'references/stroke-order/sources/osu-kapitsa-2013.pdf'},{'id':'TPU','url':TPU,'title':'Учебник на портале ТПУ: общие рекомендации движения','page':123,'local':'references/stroke-order/sources/tpu-drawing.pdf'},{'id':'UTAH','url':UTAH,'title':'University of Utah Reading Clinic: обычная латинская o, не ГОСТ','scope':'Only motor-pattern comparison, not source of GOST letter construction.'}],'rows':rows,'coverage':{'direct_glyph_diagrams':44,'adapted_by_analogy':19,'adapted_by_diacritic':3},'findings':{'Оо':'Build28 continuous loop starts along the top to the left, counter-clockwise. LENSK fig5 shows two downward halves; OSU fig1 shows four elements. No single mandatory rotation follows from these sources.','Кк':'Build28 right-side V is drawn before the left connector. LENSK fig5 shows stem, full upper arm to the stem, then lower leg from its branch.','А':'Previously approved app path rises to apex then descends in one motion. Source chart uses separate downward sides; treat this as an explicit app-specific alternative, not a GOST requirement.'},'status':'Source coverage atlas, not a claim that all existing app motions are pedagogically validated. O/o and K/k corrected in build29; other letters preserved.'}
for source in index['sources']:
 if source.get('local'):source['sha256']=hashlib.sha256((ROOT/source['local']).read_bytes()).hexdigest()
(BASE/'index.json').write_text(json.dumps(index,ensure_ascii=False,indent=2)+'\n')
font=Path('/System/Library/Fonts/Supplemental')
pdfmetrics.registerFont(TTFont('StrokeRef',str(font/'Arial.ttf')));pdfmetrics.registerFont(TTFont('StrokeRefBold',str(font/'Arial Bold.ttf')));pdfmetrics.registerFontFamily('StrokeRef',normal='StrokeRef',bold='StrokeRefBold')
styles={key:ParagraphStyle(key,fontName='StrokeRefBold' if key in ['title','head'] else 'StrokeRef',fontSize=size,leading=leading,textColor=colors.HexColor('#24392d'),spaceAfter=space) for key,size,leading,space in [('title',22,27,14),('head',13,17,9),('body',10,14,9),('entry',9,12,2),('small',8,11,4)]}
P=lambda s,key='body':Paragraph(s,styles[key]);link=lambda url,label:f'<link href="{url}" color="#275d8a">{escape(label)}</link>'
story=[P('Как вести перо: источники','title'),P('Все 33 пары русского алфавита · ГОСТ типа Б · проверка 03.11.2026','head'),P('Форма буквы и порядок движений - разные вещи. Здесь показаны реальные учебные схемы со стрелками и номерами. Наклонные образцы источника перенесены в указатель без изменения: применение к нашему прямому шрифту требует сохранить его форму, пропорции и выносы.'),P('О / о','head'),P('В сборке 28 карандаш шёл влево и замыкал контур против часовой стрелки. Само движение влево не доказывает ошибку. В сборке 29 выбран конкретный чертёжный приём: левая половина сверху вниз, затем правая тоже сверху вниз. У ОГУ показана другая схема: прямые и дуги отдельно. '+link(URL,'Ленск, стр. 36, рис. 5')+'; '+link(OSU,'ОГУ, стр. 7, рис. 1')+'.'),P('К / к','head'),P('Схема: 1 - стойка вниз; 2 - верхняя диагональ от правого верха к стойке; 3 - нижняя диагональ от ответвления вниз-вправо. В сборке 28 сначала рисовалась правая V, затем соединение со стойкой. Это расхождение с '+link(URL,'рис. 5, группа 2')+' исправлено в сборке 29. Контуры и проверка письма сохранены.'),P('Общее правило движения','head'),P('Вертикали и наклонные прямые ведут вниз, горизонтали - вправо; дуги строят отдельными удобными движениями. Это учебная рекомендация из '+link(TPU,'учебника, стр. 123')+', а не запрет другого порядка в геометрической проверке приложения.'),P('Как читать следующие страницы','head'),P('Слева в каждой строке - заглавная схема, справа - строчная. Номера и стрелки взяты из первичного учебного рисунка. «Адаптация» явно помечает производную схему, которой нет отдельным знаком в рисунке. Для строчных по схеме заглавной надо сохранить строчную высоту и собственные выносы. Это указатель источников для всех 66 форм; он не объявляет все прежние анимации приложения проверенными.'),P('Особый случай А','head'),P('Ранее в приложении одобрено непрерывное движение вверх к вершине и вниз. В учебной схеме обе стороны идут сверху вниз. Это явный альтернативный приём, а не требование ГОСТ; в этой проверке А сохранена.'),P('Обычное письмо и ГОСТ','head'),P(link(UTAH,'Клиника чтения Университета Юты')+' прямо описывает o против часовой стрелки. Это подтверждает существование такого моторного приёма, но не устанавливает способ чертёжного написания русской О.')]
selected=[r for r in rows if r['letter'] in 'ОК'] if args.canary else rows
for offset in range(0,len(selected),6):
 story.extend([PageBreak(),P('Схемы букв '+selected[offset]['letter']+' - '+selected[min(offset+5,len(selected)-1)]['letter'],'head'),P(link(URL,'Источник схем: Ленский технологический техникум, PDF стр. 36, рис. 5-6'),'small')])
 for row in selected[offset:offset+6]:
  cells=[P('<b>'+row['letter']+' '+row['letter'].lower()+'</b>','entry')]
  for case in ['upper','lower']:
   e=row[case];imgpath=ROOT/e['image']
   with Image.open(imgpath) as im:w,h=im.size
   image=PDFImage(str(imgpath),width=54*w/h,height=54)
   label=e['note']
   if e['type']=='diacritic':label+='<br/>На картинке база: '+e['base']
   if e['type']=='analogy':label+='<br/>На картинке заглавная '+e['base']
   desc=P(escape(label).replace('&lt;br/&gt;','<br/>'),'small')
   cells.append(Table([[image,desc]],colWidths=[61,148],style=[('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),0),('TOPPADDING',(0,0),(-1,-1),0)]))
  table=Table([cells],colWidths=[66,220,220],rowHeights=[99]);table.setStyle(TableStyle([('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),0),('TOPPADDING',(0,0),(-1,-1),9),('LINEBELOW',(0,0),(-1,-1),.35,colors.HexColor('#d7e1d8'))]));story.append(table)
if not args.canary:
 story.extend([PageBreak(),P('Полные схемы для сверки','head'),P(link(URL,'Ленский технологический техникум. Страница 36; рисунки 5 и 6. Фрагменты учебных схем.'),'small'),PDFImage(str(BASE/'excerpts/lensk-technical-graphics-figure-0.png'),width=440,height=440),Spacer(1,8),PDFImage(str(BASE/'excerpts/lensk-technical-graphics-figure-1.png'),width=440,height=440*191/535)])
OUT.parent.mkdir(exist_ok=True,parents=True)
def footer(canvas,doc):canvas.setFont('StrokeRef',8);canvas.setFillColor(colors.HexColor('#627868'));canvas.drawString(44,25,'Учебные схемы, не нормативный порядок ГОСТ · источники и адаптации');canvas.drawRightString(550,25,str(doc.page))
SimpleDocTemplate(str(OUT),pagesize=(595.28,841.89),leftMargin=44,rightMargin=44,topMargin=42,bottomMargin=38,title='ГОСТ: источники порядка штрихов',author='Буквы по ГОСТ').build(story,onFirstPage=footer,onLaterPages=footer)
r=PdfReader(OUT);text='\n'.join(p.extract_text() for p in r.pages)
assert all(row['letter']+' '+row['letter'].lower() in text for row in selected)
assert len(index['rows'])==33 and sum(index['coverage'].values())==66
print(json.dumps({'pdf':str(OUT),'pdf_pages':len(r.pages),'bytes':OUT.stat().st_size,'pairs_rendered':len(selected),'coverage':index['coverage']},ensure_ascii=False))
