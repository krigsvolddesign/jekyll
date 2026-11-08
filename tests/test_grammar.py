"""Render the actual include with future content, without changing canonical data."""
import json
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest
from html.parser import HTMLParser

ROOT=Path(__file__).resolve().parents[1]

class Summaries(HTMLParser):
    def __init__(self): super().__init__(); self.values=[]; self.active=False
    def handle_starttag(self, tag, attrs):
        if tag=='summary': self.active=True; self.values.append('')
    def handle_endtag(self, tag):
        if tag=='summary': self.active=False
    def handle_data(self, text):
        if self.active: self.values[-1]+=text

class ReleaseHeadings(HTMLParser):
    def __init__(self): super().__init__(); self.headings=[]; self.active=False; self.dates=[]
    def handle_starttag(self, tag, attrs):
        if tag=='h2': self.active=True; self.headings.append('')
        if tag=='time': self.dates.append(dict(attrs).get('datetime'))
    def handle_endtag(self, tag):
        if tag=='h2': self.active=False
    def handle_data(self, text):
        if self.active: self.headings[-1]+=text

class NativeGrammarTests(unittest.TestCase):
    def test_release_fields_require_one_parseable_date_and_keep_other_titles_once(self):
        with tempfile.TemporaryDirectory() as directory:
            source=Path(directory)/'source'; (source/'_includes/examples').mkdir(parents=True); (source/'_data').mkdir()
            shutil.copy2(ROOT/'_includes/examples/release-register.html',source/'_includes/examples/release-register.html')
            titles=['Next release','Next · Planned','Next · Planned · Later','1.2 · October 28, 2026']
            (source/'_data/releases.json').write_text(json.dumps({'sections':[{'id':f'release-{i}','title':title,'body':''} for i,title in enumerate(titles)]}))
            (source/'index.html').write_text('---\n---\n{% include examples/release-register.html record=site.data.releases %}')
            destination=Path(directory)/'built'
            subprocess.run(['bundle','exec','jekyll','build','--safe','--source',str(source),'--destination',str(destination)],cwd=ROOT,capture_output=True,text=True,check=True,timeout=30)
            parser=ReleaseHeadings();parser.feed((destination/'index.html').read_text())
            self.assertEqual([' '.join(x.split()) for x in parser.headings],titles)
            self.assertEqual(parser.dates,['2026-10-28'])

    def test_scoped_faq_keeps_every_future_question_and_other_faqs(self):
        with tempfile.TemporaryDirectory() as directory:
            source=Path(directory)/'source'; (source/'_includes/examples').mkdir(parents=True); (source/'_data').mkdir()
            for name in ['faq.html','faq-questions.html']:
                shutil.copy2(ROOT/'_includes/examples'/name,source/'_includes/examples'/name)
            items=[{'question':f'Question {i}?','answer':f'Answer {i}.'} for i in range(1,6)]
            (source/'_data/questions.json').write_text(json.dumps(items))
            for name,record in [('scoped','faq'),('generic','patterns')]:
                (source/f'{name}.html').write_text('---\nrecord_id: '+record+'\n---\n{% include examples/faq.html items=site.data.questions %}')
            destination=Path(directory)/'built'
            subprocess.run(['bundle','exec','jekyll','build','--safe','--source',str(source),'--destination',str(destination)],cwd=ROOT,capture_output=True,text=True,check=True,timeout=30)
            for name in ['scoped','generic']:
                parser=Summaries(); html=(destination/f'{name}.html').read_text();parser.feed(html)
                self.assertEqual(parser.values,[x['question'] for x in items])
                for item in items: self.assertIn(item['answer'],html)
                if name=='generic': self.assertNotIn('example-question-scope',html);self.assertNotIn('krigsvold-faq',html)

    def test_contents_are_explicitly_requested_and_inline_with_manual_destinations(self):
        with tempfile.TemporaryDirectory() as directory:
            source=Path(directory)/'source'; (source/'_layouts').mkdir(parents=True); (source/'_data').mkdir()
            shutil.copytree(ROOT/'_includes',source/'_includes')
            shutil.copytree(ROOT/'_plugins',source/'_plugins')
            shutil.copy2(ROOT/'_data/examples.json',source/'_data/examples.json')
            (source/'_layouts/default.html').write_text('<!doctype html><html lang="en"><main>{{ content }}</main></html>')
            for name in ['page','post','example-document','example-reading','example-dossier']:
                shutil.copy2(ROOT/'_layouts'/f'{name}.html',source/'_layouts'/f'{name}.html')
            toc=[{'id':'first','title':'First section'},{'id':'second','title':'Second section'}]
            fixtures={
                'default-page':{'layout':'page','toc':toc},
                'false-page':{'layout':'page','show_toc':False,'toc':toc},
                'string-page':{'layout':'page','show_toc':'true','toc':toc},
                'manual-page':{'layout':'page','show_toc':True,'toc':toc},
                'default-post':{'layout':'post','toc':toc},
                'default-document':{'layout':'example-document','record_id':'reference'},
                'manual-document':{'layout':'example-document','record_id':'reference','show_toc':True,'toc':[{'id':'scope','title':'Chosen scope'}]},
                'default-reading':{'layout':'example-reading','record_id':'article'},
                'default-report':{'layout':'example-dossier','record_id':'report'},
                'manual-report':{'layout':'example-dossier','record_id':'report','show_toc':True},
            }
            for name,frontmatter in fixtures.items():
                (source/f'{name}.html').write_text('---\n'+json.dumps(frontmatter)+'\n---\n<h2 id="first">First section</h2><h2 id="second">Second section</h2>')
            destination=Path(directory)/'built'
            subprocess.run(['bundle','exec','jekyll','build','--source',str(source),'--destination',str(destination)],cwd=ROOT,capture_output=True,text=True,check=True,timeout=30)
            for name in ['default-page','false-page','string-page','default-post','default-document','default-reading','default-report']:
                html=(destination/f'{name}.html').read_text()
                self.assertNotIn('aria-label="On this page"',html,name)
                self.assertNotIn('aria-label="Report sections"',html,name)
                self.assertNotIn('class="example-document"',html,name)
                self.assertNotIn('class="example-report-index"',html,name)
                self.assertIn('id="first"',html,name)
                self.assertIn('id="second"',html,name)
            manual=(destination/'manual-page.html').read_text()
            self.assertIn('<article class="content editorial-content"><nav class="toc"',manual)
            self.assertNotIn('class="page-index"',manual)
            self.assertIn('href="#first"',manual); self.assertIn('href="#second"',manual)
            document=(destination/'manual-document.html').read_text()
            self.assertIn('<article aria-labelledby="page-title"><nav class="example-local-index"',document)
            self.assertIn('href="#scope">Chosen scope</a>',document)
            self.assertNotIn('href="#register"',document)
            report=(destination/'manual-report.html').read_text()
            self.assertIn('aria-label="Report sections"',report)
            self.assertIn('href="#register"',report)

if __name__=='__main__': unittest.main()
