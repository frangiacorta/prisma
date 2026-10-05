import getpass,json,os,subprocess,sys
from pathlib import Path
root=Path('/workspace/prisma-studio')
payload=json.loads(getpass.getpass('Ready for Site workflow JSON on stdin (input is hidden): '))
c=payload['credential'];env=dict(os.environ)
env.update(GIT_TERMINAL_PROMPT='0',GIT_CONFIG_COUNT='2',GIT_CONFIG_KEY_0='http.extraHeader',GIT_CONFIG_VALUE_0='Authorization: Bearer '+c['token'],GIT_CONFIG_KEY_1='credential.helper',GIT_CONFIG_VALUE_1='')
def git(*args):
 p=subprocess.run(['git',*args],cwd=root,env=env,text=True,capture_output=True)
 if p.returncode:raise RuntimeError(p.stderr.replace(c['token'],'[redacted]'))
 return p.stdout.strip()
git('fetch',c['remote_url'],c['branch'])
head=git('rev-parse','HEAD');remote=git('rev-parse','FETCH_HEAD')
if payload.get('archivePath'):
 if remote!=head and git('merge-base',remote,head)!=remote:raise RuntimeError('Remote source changed; reconcile before publishing.')
 git('add','dist','.openai/hosting.json')
 if git('diff','--cached','--name-only'):git('commit','-m','Recognize natural motion commands and preserve explicit motion constraints')
 head=git('rev-parse','HEAD');git('push',c['remote_url'],'HEAD:'+c['branch'])
 archive=Path(payload['archivePath'])
 with archive.open('wb') as f:
  p=subprocess.run(['git','archive','--format=tar',head,'.openai/hosting.json','dist'],cwd=root,env=env,stdout=f,stderr=subprocess.PIPE)
  if p.returncode:raise RuntimeError(p.stderr.decode())
 print(json.dumps({'project_id':payload['project_id'],'commit_sha':head,'archive':str(archive),'checkout_path':str(root)}))
else:
 if head!=remote:raise RuntimeError('Checkout differs from the remote source; reconcile before editing.')
 print(json.dumps({'project_id':payload['project_id'],'commit_sha':head,'checkout_path':str(root),'branch':c['branch']}))
