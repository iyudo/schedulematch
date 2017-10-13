// requireJS
var express = require('express'), 
	bodyParser = require('body-parser'),
	MongoClient = require('mongodb').MongoClient,
	path = require('path'),
	session = require('express-session'),
	cors = require('cors');

// Connection URL
var url = 'mongodb://iyudo26:secret@ds147544.mlab.com:47544/schedulematch';

// Configure express app, use body-parser, use cors, use express-session, use cors for ajax
app = express();
app.use(cors());
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());
app.use(session({
	secret: 'created by ivan',
	resave: false,
	saveUninitialized: false
}));
app.use('/', express.static('../Frontend')); //.. is considered dangerous, thus using path resolve

// Handler for GET request
app.get('/', function(req, res){
	res.redirect('login.html');
});

app.get('/logout', function(req, res){
	req.session.destroy();
	res.redirect('login.html');
});

app.get('/schedule', function(req, res){
	if(!req.session.user){
		res.redirect('login.html?authenticated=no');
	} else {
		res.redirect('schedule.html');
	}	
});


// Handler for POST request
app.post('/login', function(req, res){
	var email = req.body.email;
	var password = req.body.password;

	MongoClient.connect(url, function(err, db) {
		// NOTE: research on javascript error handling
		// without throw statement, the server exits when error exist
	 	db.collection('credentials').find({email: email, password: password}).nextObject(function (err, result) {
	    if (err) throw err;
	    db.close();
	    if(result){
	    	req.session.user = result._id;
	    	req.session.name = result.username;
	    	res.redirect('schedule.html');
	    } else{
	    	res.redirect('login.html?value=no');
	    }
	  });
	});
});

app.post('/register', function(req, res){
	var email = req.body.email;
	var username = req.body.username;
	var password = req.body.password;

	MongoClient.connect(url, function(err, db) {
		// NOTE: research on javascript error handling
		// without throw statement, the server exits when error exist
	 	db.collection('credentials').insertOne({
	 		email: email,
	 		username: username,
	 		password: password
	 	});
	 	res.redirect('login.html?value=added');
	});
});

app.post('/addTime', function(req, res){
	if(!req.session.user){
		res.redirect('login.html?authenticated=no');
	} else {
		if(!req.body){
			res.redirect('schedule.html?posted=no');
		} else {
			var postData = Object.keys(req.body).length;
			postData /= 3;

			if(postData === 0){
				
			} else {
				MongoClient.connect(url, function(err, db) {
					// NOTE: research on javascript error handling
					// without throw statement, the server exits when error exist
					for(let i = 0; i < postData; i++){
						console.log(`testing to update index ${i}`);
						var start = req.body[`datas[${i}][start]`];
						var end = req.body[`datas[${i}][end]`];
						var date = req.body[`datas[${i}][date]`];

						const availability = db.collection('availability');
						const userSchedule = db.collection('userSchedule');

						availability.update({
							date: new Date(`${date}`)
						}, {
							$set: {
								date: new Date(`${date}`)
							},
							$addToSet: {
								users: {
									user: req.session.user,
									name: req.session.name
								}
							}
						}, {
							upsert:true
						});

						userSchedule.update({
							user: req.session.user,
							name: req.session.name,
							date: new Date(`${date}`)
						}, {
							$set: {
								date: new Date(`${date}`),
								start: new Date(`${date}T${start}`).getTime(),
								end: new Date(`${date}T${end}`).getTime()
							}
						}, {
							upsert:true
						});
					}
				 	db.close();
				 	res.send('Successfully inserted');
				});
			}
		}
		
	}	
	
});

app.post('/match', function(req, res){
	if(!req.session.user){
		res.redirect('login.html?authenticated=no');
	} else {
		MongoClient.connect(url, function(err, db) {
			// NOTE: research on javascript error handling
			// without throw statement, the server exits when error exist
			// let arr = [];
			// let userStart = 0;
			// let userEnd = 0;
		 	db.collection('userSchedule').find({user: req.session.user}).toArray(function(err, result){
		 		db.close();
		 		res.send(result);
		 	});
		});
	}	
});

app.post('/try', function(req, res){
	if(!req.session.user){
		res.redirect('login.html?authenticated=no');
	} else {
		MongoClient.connect(url, function(err, db) {
			// NOTE: research on javascript error handling
			// without throw statement, the server exits when error exist
			// console.log(req.body.date);
		 	db.collection('userSchedule').find({
		 		date: new Date(req.body.date),
		 		user: {
		 			$not: {
		 				$eq: req.session.user
		 			}
		 		}
		 	}).toArray(function(err, result){
		 		res.send(result);
		 	});
		});
	}	
});


// configure listening port
const server = app.listen(process.env.PORT || 3000, function(){
	const port = server.address().port;
	console.log(`server listening on port ${port}`);
});

// todo: 
// - research on express cookies for session management
// - research on memcached and redis
// - research on http SET-COOKIE, or cookies in general