import urllib.request
import urllib.error
import uuid

def post_multipart(url, filepath):
    boundary = uuid.uuid4().hex
    with open(filepath, 'rb') as f:
        file_bytes = f.read()
    filename = filepath.replace('\\', '/').split('/')[-1]
    
    body = (
        f'--{boundary}\r\n'
        f'Content-Disposition: form-data; name="file"; filename="{filename}"\r\n'
        f'Content-Type: image/jpeg\r\n\r\n'
    ).encode() + file_bytes + f'\r\n--{boundary}--\r\n'.encode()
    
    req = urllib.request.Request(url, data=body, headers={
        'Content-Type': f'multipart/form-data; boundary={boundary}'
    })
    try:
        res = urllib.request.urlopen(req)
        return res.status, res.read().decode()
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()

code1, resp1 = post_multipart('http://127.0.0.1:8000/inspect', 'material_dataset/non_steel/non_steel_001.jpg')
print('Non-Steel Capsule response status:', code1)
print('Non-Steel response body:', resp1)

code2, resp2 = post_multipart('http://127.0.0.1:8000/inspect', 'material_dataset/steel/steel_001.jpg')
print('\nSteel response status:', code2)
print('Steel response body prefix:', resp2[:160])
