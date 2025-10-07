from flask import Flask, render_template

app = Flask(__name__)

@app.route('/')
def home():
    return render_template('home.html')

@app.route('/single-tile')
def single_tile():
    return render_template('index.html')

@app.route('/continuum')
def continuum():
    return render_template('continuum.html')

if __name__ == '__main__':
    app.run(debug=True)