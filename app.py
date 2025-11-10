from flask import Flask, render_template

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/single')
def single():
    return render_template('single.html')

@app.route('/continuum')
def continuum():
    return render_template('continuum.html')

if __name__ == '__main__':
    app.run(debug=True)