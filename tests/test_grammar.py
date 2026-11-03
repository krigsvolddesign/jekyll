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

class NativeGrammarTests(unittest.TestCase):
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

if __name__=='__main__': unittest.main()
