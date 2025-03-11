import json
from os import environ as env, makedirs, path
from urllib.parse import quote_plus, urlencode
from authlib.integrations.flask_client import OAuth
from dotenv import find_dotenv, load_dotenv
from flask import Flask, redirect, render_template, session, jsonify, send_from_directory, request
import uuid
from werkzeug.utils import secure_filename
from tiles import tile_split
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

ENV_FILE = find_dotenv()
if ENV_FILE:
    print("Load .env values from", ENV_FILE)
    load_dotenv(ENV_FILE)



    
app = Flask(__name__)
app.secret_key = env.get("APP_SECRET_KEY")
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///uploads.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['MAX_CONTENT_LENGTH'] = 100 * 1024 * 1024  # 16 MB limit
MY_URL = env.get("MY_URL")

db = SQLAlchemy(app)

class FileUpload(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    uuid = db.Column(db.String(36), nullable=False)
    description = db.Column(db.String(200), nullable=False)
    width = db.Column(db.Integer, nullable=False)
    height = db.Column(db.Integer, nullable=False)
    upload_date = db.Column(db.DateTime, default=datetime.utcnow)
    uploader = db.Column(db.String(32), nullable=False)
    def __repr__(self):
        return f'<FileUpload {self.uuid}>'

with app.app_context():
    db.create_all()

oauth = OAuth(app)

oauth.register(
    "auth0",
    client_id=env.get("AUTH0_CLIENT_ID"),
    client_secret=env.get("AUTH0_CLIENT_SECRET"),
    client_kwargs={
        "scope": "openid profile email",
    },
    server_metadata_url=f'https://{env.get("AUTH0_DOMAIN")}/.well-known/openid-configuration'
)

@app.route("/login")
def login():
    return oauth.auth0.authorize_redirect(
        redirect_uri=f'{env.get("MY_URL")}callback'
    )

@app.route("/callback", methods=["GET", "POST"])
def callback():
    token = oauth.auth0.authorize_access_token()
    session["user"] = token
    return redirect("/")

@app.route("/logout")
def logout():
    session.clear()
    return redirect(
        "https://" + env.get("AUTH0_DOMAIN")
        + "/v2/logout?"
        + urlencode(
            {
                "returnTo": f'{env.get("MY_URL")}',
                "client_id": env.get("AUTH0_CLIENT_ID"),
            },
            quote_via=quote_plus,
        )
    )

@app.route('/js/<path:path>')
def send_js(path):
    return send_from_directory('js', path)

@app.route('/icons/<path:path>')
def send_icons(path):
    return send_from_directory('icons', path)

@app.route('/tiles/<path:path>')
def send_tiles(path):
    return send_from_directory('tiles', path)

@app.route('/css/<path:path>')
def send_css(path):
    return send_from_directory('css', path)

@app.route("/userdata.json")
def userdata():
    userdata={}
    if session.get('user'):
      userdata=json.dumps(session.get('user')['userinfo'])
    return render_template("userdata.json", session=True, pretty=userdata)

@app.route("/upload")
def upload_html():
    return send_from_directory("web", "upload.html")

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    
    file = request.files['file']
    print("file", file)
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    result = tile_split(file.stream)

    db.session.add(FileUpload(uuid=result['uuid'], 
                              description=file.filename, 
                              width=result['width'], 
                              height=result['height'],
                              uploader="unknown"))
    db.session.commit()

    return jsonify({
        'success': True,
        'original_name': file.filename,
        'saved_as': result,
    })

@app.route("/zoom")
def zoom():
    return send_from_directory("web", "zoom.html")

@app.route("/")
def home():
    files = FileUpload.query.order_by(FileUpload.upload_date.desc()).all()
    files_data = [{
        'uuid': file.uuid,
        'description': file.description,
        'width': file.width,
        'height': file.height,
        'upload_date': file.upload_date.strftime('%Y-%m-%d %H:%M:%S')
    } for file in files]
    # return jsonify(files_data)
    return render_template("index.html", session=True, pretty=files_data)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=env.get("PORT", 3000))