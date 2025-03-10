import json
from os import environ as env
from urllib.parse import quote_plus, urlencode
from authlib.integrations.flask_client import OAuth
from dotenv import find_dotenv, load_dotenv
from flask import Flask, redirect, render_template, session, url_for, send_from_directory

ENV_FILE = find_dotenv()
if ENV_FILE:
    load_dotenv(ENV_FILE)
    
app = Flask(__name__)
app.secret_key = env.get("APP_SECRET_KEY")

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
        redirect_uri="https://zoom.ar.lublin.pl/callback" #url_for("callback", _external=True)
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
                "returnTo": "https://zoom.ar.lublin.pl/",
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

@app.route('/default/<path:path>')
def send_tiles(path):
    return send_from_directory('default', path)

@app.route('/css/<path:path>')
def send_css(path):
    return send_from_directory('css', path)

@app.route("/userdata.json")
def userdata():
    userdata={}
    if session.get('user'):
      userdata=session.get('user')['userinfo']
    return render_template("userdata.json", session=True, pretty=userdata)
    
@app.route("/")
def home():
    return render_template("index.html", session=session.get('user'), pretty=session.get('user'))

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=env.get("PORT", 3000))