"""Build a compact, searchable index of visually reviewed source pages."""
from pathlib import Path
import json, hashlib, argparse
from xml.sax.saxutils import escape
from PIL import Image
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, Image as PDFImage
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from pypdf import PdfReader

ROOT=Path(__file__).resolve().parents[1]
DATA=ROOT/'references/propisi-2019-content.json'
BASE=ROOT/'references/propisi-2019-content'
OUT=ROOT/'output/pdf/propisi-2019-content-reference.pdf'

def build():
 data=json.loads(DATA.read_text()); entries=data['pages']; ids=[p['pdf_page'] for p in entries]
 assert len(ids)==len(set(ids)) and all(1<=p<=72 for p in ids)
 if data['status']=='complete': assert ids==list(range(1,73))
 source=Path(data['source']['path'])
 assert hashlib.sha256(source.read_bytes()).hexdigest()==data['source']['sha256']
 fontbase=Path('/System/Library/Fonts/Supplemental')
 for name,file in [('Ref','Arial.ttf'),('RefBold','Arial Bold.ttf')]:pdfmetrics.registerFont(TTFont(name,str(fontbase/file)))
 pdfmetrics.registerFontFamily('Ref',normal='Ref',bold='RefBold',italic='Ref',boldItalic='RefBold')
 styles=getSampleStyleSheet()
 for style in styles.byName.values():style.fontName='Ref';style.textColor=colors.HexColor('#20382c')
 styles.add(ParagraphStyle(name='TitleRu',fontName='RefBold',fontSize=24,leading=29,spaceAfter=16))
 styles.add(ParagraphStyle(name='HeadRu',fontName='RefBold',fontSize=14,leading=18,spaceAfter=10))
 styles.add(ParagraphStyle(name='BodyRu',fontName='Ref',fontSize=10,leading=14,spaceAfter=8))
 styles.add(ParagraphStyle(name='EntryRu',fontName='Ref',fontSize=9,leading=12))
 styles.add(ParagraphStyle(name='SmallRu',fontName='Ref',fontSize=8,leading=10))
 P=lambda s,style='BodyRu':Paragraph(s,styles[style])
 story=[P('Пропись: карта содержания','TitleRu'),P('Справочник для проекта «Буквы по ГОСТ»','HeadRu'),P('Источник: «Пропись. 1 класс», М. Х. Тохтаходжаева, В. А. Белова, Н. М. Вейцман. Ташкент, «Узбекистан», 2019. 72 страницы. Краткое описание заданий, а не новая пропись.'),P('Проверка: '+('все 72 страницы просмотрены целиком.' if data['status']=='complete' else 'пробный сквозной разбор страниц 17-18.'))]
 for title,body in data.get('findings',[]):story.extend([P(escape(title),'HeadRu'),P(escape(body))])
 story.extend([Spacer(1,10),P('Как пользоваться','HeadRu'),P('Номера в справочнике - страницы исходного PDF (счёт с 1). Печатный номер указан отдельно; у обложки и выходных сведений его может не быть. Миниатюры помогают узнать страницу. Для работы с содержанием достаточно описаний и файла propisi-2019-content.json; полный исходник нужен только для точной сверки.'),P('Граница переноса: последовательность учебных действий берём из источника. Школьные связки, неотрывное письмо и наклонную сетку не переносим в ГОСТ. Адаптация и наблюдения автора справочника отделены от содержания источника.')])
 groups=data.get('lesson_groups',[])
 if groups:
  story.extend([PageBreak(),P('Карта буквенных групп','TitleRu')]);rows=[[P('Буква','SmallRu'),P('Страницы PDF','SmallRu'),P('Структура','SmallRu')]]
  for g in groups:rows.append([P(escape(g['letter']),'SmallRu'),P(escape(g['range']),'SmallRu'),P(escape(g['structure']),'SmallRu')])
  table=Table(rows,colWidths=[52,88,365],repeatRows=1);table.setStyle(TableStyle([('VALIGN',(0,0),(-1,-1),'TOP'),('TOPPADDING',(0,0),(-1,-1),4),('BOTTOMPADDING',(0,0),(-1,-1),4),('BACKGROUND',(0,0),(-1,0),colors.HexColor('#eaf0e8')),('LINEBELOW',(0,0),(-1,0),.5,colors.HexColor('#a8b8aa'))]));story.append(table)
 for offset in range(0,len(entries),6):
  story.extend([PageBreak(),P('По страницам: '+str(entries[offset]['pdf_page'])+'-'+str(entries[min(offset+5,len(entries)-1)]['pdf_page']),'HeadRu')])
  for entry in entries[offset:offset+6]:
   n=entry['pdf_page'];image=BASE/'pages'/f'page-{n:02d}.jpg';assert image.exists(),image
   thumb=BASE/'thumbs'/f'page-{n:02d}.jpg';thumb.parent.mkdir(exist_ok=True)
   with Image.open(image) as im:
    im.thumbnail((240,320));im.convert('RGB').save(thumb,quality=55,optimize=True)
   with Image.open(thumb) as im:w,h=im.size
   title=f"<b>PDF {n:02d} · {escape(entry['title'])}</b>"
   printed=entry.get('printed_page');title+=f"<br/><font color='#65786a'>Печатная стр. {printed if printed is not None else 'без номера'} · {escape(entry['kind'])}</font>"
   text=title+'<br/>'+escape(entry['content'])
   if entry.get('action'):text+='<br/><b>Действие ребёнка:</b> '+escape(entry['action'])
   if entry.get('note'):text+='<br/><b>Примечание:</b> '+escape(entry['note'])
   paragraph=P(text,'EntryRu');assert paragraph.wrap(417,100)[1]<=100,f'Entry {n} overflows row'
   row=Table([[PDFImage(str(thumb),width=68,height=68*h/w),paragraph]],colWidths=[82,423],rowHeights=[110]);row.setStyle(TableStyle([('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),0),('TOPPADDING',(0,0),(-1,-1),5),('BOTTOMPADDING',(0,0),(-1,-1),5),('LINEBELOW',(0,0),(-1,-1),.35,colors.HexColor('#dce3d9'))]));story.append(row)
 OUT.parent.mkdir(parents=True,exist_ok=True)
 def footer(canvas,doc):
  canvas.setFont('Ref',8);canvas.setFillColor(colors.HexColor('#65786a'));canvas.drawString(44,25,'Карта содержания · 03.11.2026 · источник: пропись 2019');canvas.drawRightString(551,25,str(doc.page))
 SimpleDocTemplate(str(OUT),pagesize=(595.28,841.89),leftMargin=44,rightMargin=44,topMargin=42,bottomMargin=38,title='Пропись 2019 - карта содержания',author='Проект Буквы по ГОСТ',pageCompression=1).build(story,onFirstPage=footer,onLaterPages=footer)
 pdf=PdfReader(OUT);text='\n'.join(p.extract_text() for p in pdf.pages)
 for n in ids:assert f'PDF {n:02d}' in text,f'missing page {n}'
 assert '\ufffd' not in text
 print(json.dumps({'file':str(OUT),'pdf_pages':len(pdf.pages),'reviewed_source_pages':len(ids),'bytes':OUT.stat().st_size},ensure_ascii=False))

if __name__=='__main__':build()
