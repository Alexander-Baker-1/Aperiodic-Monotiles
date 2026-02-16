from flask import Flask, render_template

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/single')
def single():
    return render_template('single.html')

@app.route('/cluster')
def cluster():
    return render_template('cluster.html')

@app.route('/infinite')
def infinite():
    return render_template('infinite.html')

@app.route('/substitution')
def substitution():
    return render_template('substitution.html')

@app.route('/chains')
def chains():
    return render_template('chains.html')

@app.route('/constraint-tester')
def constraint_tester():
    return render_template('constraint-tester.html')

if __name__ == '__main__':
    app.run(debug=True)