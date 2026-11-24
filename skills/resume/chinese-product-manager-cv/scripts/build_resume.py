#!/usr/bin/env python3
"""Build a one-page Chinese product manager CV from portable JSON data."""
from __future__ import annotations

import argparse
from io import BytesIO
import json
import os
from pathlib import Path
import re
from xml.sax.saxutils import escape

from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph

W, H = 595.0, 842.0
LEFT, RIGHT = 30.0, 565.0
WIDTH = RIGHT - LEFT
BODY, LEADING = 9.0, 17.28


def rich_text(value: str) -> str:
    """Escape plain text, allowing only paired inline bold markup."""
    parts = re.split(r"(</?b>)", value)
    depth = 0
    for i, part in enumerate(parts):
        if part == '<b>':
            depth += 1
        elif part == '</b>':
            depth -= 1
        else:
            parts[i] = escape(part)
        if depth not in (0, 1):
            raise ValueError('Bold tags must be paired and must not nest.')
    if depth:
        raise ValueError('Unclosed bold tag.')
    return ''.join(parts)


def mixed_fonts(value: str) -> str:
    parts = re.split(r"(<[^>]+>|&(?:#\d+|#x[0-9A-Fa-f]+|[A-Za-z][A-Za-z0-9]*);)", value)
    bold = False
    for i, part in enumerate(parts):
        if part == '<b>':
            bold = True
        elif part == '</b>':
            bold = False
        elif part.startswith(('<', '&')):
            continue
        else:
            font = 'CVLatin-Bold' if bold else 'CVLatin'
            parts[i] = re.sub(
                r'[A-Za-z0-9]+(?:[ .,+%/×_-]*[A-Za-z0-9]+)*[%]?',
                lambda m: f'<font name="{font}">{m.group(0)}</font>', part)
    return ''.join(parts)


def plain(value: str) -> str:
    return value.replace('<b>', '').replace('</b>', '')


class Resume:
    def __init__(self, data: dict, input_dir: Path):
        self.data, self.input_dir = data, input_dir
        self.blocks, self.warnings = [], []
        self.buffer = BytesIO()
        self.c = canvas.Canvas(self.buffer, pagesize=(W, H), pageCompression=1)
        self.c.setTitle(f"{data['name']} | 产品经理求职简历")
        self.c.setAuthor(data['name'])

    def paragraph(self, text, top, size=BODY, leading=LEADING, bullet=False):
        available = WIDTH - (9 if bullet else 0)
        x = LEFT + (9 if bullet else 0)
        p = Paragraph(mixed_fonts(text), ParagraphStyle(
            'cv', fontName='CVCN', fontSize=size, leading=leading,
            textColor='#111111', wordWrap='CJK', splitLongWords=0,
            allowWidows=0, allowOrphans=0))
        _, height = p.wrap(available, H)
        lines = []
        for line in p.blPara.lines:
            spare = line[0] if isinstance(line, tuple) else line.extraSpace
            words = line[1] if isinstance(line, tuple) else [w.text for w in line.words]
            if spare < -0.01:
                raise ValueError(f'Line exceeds available width: {plain(text)}')
            lines.append({'fill': round(1-spare/available, 3), 'text': ''.join(words)})
        if bullet and len(lines) > 1 and lines[-1]['fill'] < 0.5:
            self.warnings.append(f'条目尾行不足一半：{plain(text)}')
        if bullet and len(lines) > 3:
            self.warnings.append(f'条目超过三行，检查是否可精简：{plain(text)}')
        p.drawOn(self.c, x, H-top-height)
        if bullet:
            self.c.setFont('CVCN', 9)
            self.c.drawString(LEFT, H-top-size+0.2, '•')
        self.blocks.append({'kind': 'bullet' if bullet else 'paragraph',
            'text': plain(text), 'top': round(top, 3),
            'bottom': round(top+height, 3), 'line_data': lines})
        return top+height

    def section(self, label, top):
        end = self.paragraph('<b>'+escape(label)+'</b>', top, 15.02, 18)
        self.c.setLineWidth(0.65)
        self.c.line(LEFT, H-end-1, RIGHT, H-end-1)
        return end+6

    def entry(self, title, date, top, size=9.96, gap=20.8):
        used = (pdfmetrics.stringWidth(title, 'CVCN-Bold', size)
                + pdfmetrics.stringWidth(date, 'CVCN-Bold', 9))
        if used+10 >= WIDTH:
            raise ValueError(f'Title and date need at least 10 pt separation: {title}')
        self.c.setFont('CVCN-Bold', size)
        self.c.drawString(LEFT, H-top-size, title)
        self.c.setFont('CVCN-Bold', 9)
        self.c.drawRightString(RIGHT, H-top-size, date)
        self.blocks.append({'kind':'entry', 'text':title, 'date':date,
            'top':round(top,3), 'bottom':round(top+gap,3)})
        return top+gap

    def bullets(self, items, top):
        for i, item in enumerate(items):
            label = item['label'].strip()
            count = len(re.sub(r'\s', '', label))
            if not 1 <= count <= 12 or any(ch in label for ch in '<>：:'):
                raise ValueError(f'Label must be 1-12 visible characters, no colon: {label}')
            text = '<b>'+escape(label)+'：</b>'+rich_text(item['text'])
            top = self.paragraph(text, top, bullet=True)
            if i < len(items)-1:
                top += 1
        return top

    def header(self):
        d, c = self.data, self.c
        photo = d.get('photo')
        if photo:
            path = Path(photo).expanduser()
            if not path.is_absolute():
                path = self.input_dir / path
            image = ImageReader(str(path))
            iw, ih = image.getSize()
            scale = min(43/iw, 62.7/ih)
            pw, ph = iw*scale, ih*scale
            c.drawImage(image, RIGHT-43+(43-pw)/2, H-68,
                        width=pw, height=ph, mask='auto')
        name = d['name']
        if pdfmetrics.stringWidth(name, 'CVCN-Bold', 18.02) > 240:
            raise ValueError('Name is too wide for the fixed header.')
        c.setFont('CVCN-Bold', 18.02)
        c.drawCentredString(W/2, H-27, name)
        center = (LEFT+RIGHT-43)/2 if photo else (LEFT+RIGHT)/2
        contact_right = RIGHT-55 if photo else RIGHT
        contacts = d.get('contacts', '')
        contact_width = pdfmetrics.stringWidth(contacts, 'CVCN', 12)
        if center-contact_width/2 < LEFT or center+contact_width/2 > contact_right:
            raise ValueError('Contacts exceed the single line; shorten fields, not font size.')
        c.setFont('CVCN', 12)
        c.drawCentredString(center, H-47.06, contacts)

    def build(self):
        self.header()
        top = 50.5
        any_section = False
        education = self.data.get('education', [])
        if education:
            top = self.section('教育背景', top)
            for item in education:
                top = self.entry(item['title'], item['date'], top, 9, 17.28)
                if item.get('details'):
                    top = self.paragraph(rich_text(item['details']), top)
            any_section = True
        for key, label, size in [('internships', '实习经历', 9.96),
                                  ('projects', '项目经历', 9)]:
            items = self.data.get(key, [])
            if not items:
                continue
            top = self.section(label, top+(2 if any_section else 0))
            for i, item in enumerate(items):
                if i:
                    self.c.setLineWidth(0.65)
                    self.c.line(LEFT, H-top-1, RIGHT, H-top-1)
                    self.blocks.append({'kind': 'entry_separator', 'section': key,
                                        'top': round(top+1, 3)})
                    top += 3
                top = self.entry(item['title'], item['date'], top, size)
                top = self.bullets(item.get('bullets', []), top)
            any_section = True
        awards = self.data.get('awards', [])
        if awards:
            top = self.section('竞赛荣誉', top+(2 if any_section else 0))
            if not 3 <= len(awards) <= 4:
                self.warnings.append('竞赛通常展示3-4项；请按真实奖项数量取舍。')
            for item in awards:
                top = self.entry(item['title'], item['result'], top, 9, 17.28)
        footer = []
        if self.data.get('skills'):
            footer.append('<b>技能：</b>'+rich_text(self.data['skills']))
        if self.data.get('languages'):
            footer.append('<b>语言：</b>'+rich_text(self.data['languages']))
        if footer:
            top = self.paragraph('；'.join(footer), top+4)
            if len(self.blocks[-1]['line_data']) > 1:
                raise ValueError('Skills and languages exceed one line; keep only relevant items.')
        bottom_margin = H-top
        if bottom_margin < 27:
            raise ValueError(f'Content exceeds one page: bottom margin {bottom_margin:.2f} pt; edit content.')
        if bottom_margin > 65:
            self.warnings.append('页底留白超过65pt；核对是否删去了重要证据，不要拉大行距填空。')
        self.c.showPage()
        self.c.save()
        return self.buffer.getvalue(), {'page_count':1, 'page_size_pt':[W,H],
            'margins_lr_pt':[LEFT,W-RIGHT], 'body_size_pt':BODY,
            'leading_pt':LEADING, 'final_bottom_pt':round(top,3),
            'bottom_margin_pt':round(bottom_margin,3), 'warnings':self.warnings,
            'blocks':self.blocks}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--input', required=True, type=Path)
    parser.add_argument('--output', required=True, type=Path)
    fonts = Path(os.environ.get('WINDIR', 'C:/Windows')) / 'Fonts'
    for flag, default in [('cn-regular','msyh.ttc'), ('cn-bold','msyhbd.ttc'),
                          ('latin-regular','arial.ttf'), ('latin-bold','arialbd.ttf')]:
        parser.add_argument('--'+flag, type=Path, default=fonts/default)
    parser.add_argument('--cn-index', type=int, default=0)
    parser.add_argument('--cn-bold-index', type=int, default=0)
    args = parser.parse_args()
    if args.input.resolve() == args.output.resolve():
        raise ValueError('Input and output must be different files.')
    font_specs = [('CVCN',args.cn_regular,args.cn_index),
        ('CVCN-Bold',args.cn_bold,args.cn_bold_index),
        ('CVLatin',args.latin_regular,0),('CVLatin-Bold',args.latin_bold,0)]
    for name, path, index in font_specs:
        if not path.is_file():
            raise FileNotFoundError(f'Provide a legal font file using font options: {path}')
        pdfmetrics.registerFont(TTFont(name, str(path), subfontIndex=index))
    for name in ('CVCN','CVLatin'):
        pdfmetrics.registerFontFamily(name, normal=name, bold=name+'-Bold',
                                      italic=name, boldItalic=name+'-Bold')
    data = json.loads(args.input.read_text(encoding='utf-8-sig'))
    pdf, report = Resume(data, args.input.resolve().parent).build()
    report['fonts'] = {name:str(path) for name,path,_ in font_specs}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_bytes(pdf)
    report_path = args.output.with_suffix('.layout.json')
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps({'output':str(args.output), 'layout':str(report_path),
                     'bottom_margin_pt':report['bottom_margin_pt'],
                     'warnings':report['warnings']}, ensure_ascii=False))


if __name__ == '__main__':
    main()
