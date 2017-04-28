var express = require('express');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var session = require('express-session');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var NaverStrategy = require('passport-naver').Strategy;
var flash = require('connect-flash');
var app = express();

app.use(express.static(__dirname + '/public'));
app.use(bodyParser.urlencoded({extended : false}));
app.use(session({
	secret: 'creatcreatcreatcreatcreat',
	resave: false,
	saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());
app.engine('html', require('ejs').__express);
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

//페이지 연결
app.get('/', function(req, res) {
	res.redirect('/main');
});
//로그아웃
app.get('/logout', function(req, res) {
	//마지막 로그아웃 시간 기록
	var dateUTC = new Date();
	var dateKTC = dateUTC.setHours(dateUTC.getHours() + 9);
	User.update({_id : req.user._id}, {$set : {last_logout : dateKTC}}, function(err) {
		if (err) throw err;
	});
	req.logout();
	req.session.save(function() {
		res.redirect('/login');
	});
});
//DB 커넥트
mongoose.connect("mongodb://yong.netb.co.kr:443/creat");
var db = mongoose.connection;
db.once("open",function () {
	console.log("DB connected!");
});
db.on("error",function (err) {
	console.log("DB ERROR :", err);
});
//서버 시작
app.listen(3000);
console.log("Server running on port 3000");

//유저전역 스키마 생성
var userData = mongoose.Schema({
    user_id : {type : String, unique : true},
    user_pw : {type : String},
    user_nick : {type : String, unique : true},
    lv : {type : Number},
    max_exp : {type : Number},
    exp : {type : Number},
    win : {type : Number},
    lose : {type : Number},
    gold : {type : Number},
    pearl : {type : Number},
    log : [String],
    log_buy : [String],
    read_log : [String],
    email : {type : String},
    sns : {type : String},
    created_at : {type : Date, default : Date.now},
    last_logout : {type : Date}
});
//패스워드 비교 userData를 User에 담기 전에 이걸 써넣어야 로그인 사용가능
userData.methods.validPassword = function(password) {
    return this.user_pw == password;
};
var User = mongoose.model('userData', userData);
app.get('/join', function(req, res) {
	res.render('join');
});
//회원가입
app.post('/joinForm', function(req, res) {
    var user = new User({
    	user_id : req.body.userId,
    	user_pw : req.body.userPw,
    	user_nick : req.body.userNick,
    	lv : 1,
    	max_exp : 10,
    	exp : 0,
    	win : 0,
    	lose : 0,
    	gold : 0,
    	pearl : 0,
    	log : [],
    	log_buy : [],
    	read_log : [],
    	email : "",
    	sns : ""
   	});
    user.save(function(err) {
        if (err) {
        	res.send('<script>alert("사용 중인 닉네임 또는 아이디 입니다.");location.href="/join";</script>');
        	return console.error(err);
        }
        else res.send('<script>alert("가입 완료");location.href="/";</script>');
    });
});
//로그인
passport.serializeUser(function(user, done) {
	done(null, user);
});
passport.deserializeUser(function(user, done) {
	done(null, user);
});
passport.use(new LocalStrategy({passReqToCallback : true},function (req, username, password, done) {
	User.findOne({user_id : username}, function (err, user) {
		if (err) {
			return done(err);
		}
		if (!user) {
			return done(null, false, req.flash('message', '아이디가 없습니다.'));
		}
		if (!user.validPassword(password)) {
			return done(null, false, req.flash('message', '비밀번호가 틀렸습니다.'));
		}
		return done(null, user);
   	});
}));
//네이버 로그인
function ensureAuthenticated(req, res, next) {
	if (req.isAuthenticated()) { 
		return next(); 
	}
	res.redirect('/login');
}
app.get('/account', ensureAuthenticated, function(req, res) {
	res.render('account', {user : req.user});
});
passport.use(new NaverStrategy({
        clientID: "_SX5sVw5qJDBFgMAsJ8p",
        clientSecret: "JUbcQKTuCB",
        callbackURL: "/login/naver"
	}, function(accessToken, refreshToken, profile, done) {
	    User.findOne({email : profile._json.email}, function(err, user) {
	        if (!user) {
	        	var user = new User({
			    	lv : 1,
			    	max_exp : 10,
			    	exp : 0,
			    	win : 0,
			    	lose : 0,
			    	gold : 0,
			    	pearl : 0,
			    	log : [],
			    	log_buy : [],
			    	read_log : [],
			    	email : profile.emails[0].value,
			    	sns : "naver"
			   	});
	            user.save(function(err) {
	                if (err) console.log(err);
	                return done(err, user);
	            });
	        } else {
	            return done(err, user);
	        }
	    });

    }
));
app.get('/login/naver', passport.authenticate('naver'), function(req, res) {
	if (req.user.user_nick !== "") {
		res.render('main', {user : req.user});
	} else {
		res.render('join_nick', {user : req.user});
	}
});
app.get('/join_nick', function(req, res) {
	res.render('join_nick', {user : req.user});
});
app.post('/joinNickForm', function(req, res) {
	User.update({_id : req.user._id}, {$set : {user_nick : req.body.userNick}}, function(err) {
		res.render('main', {user : req.user});
	});
});
app.get('/login/naver/callback', passport.authenticate('naver', {
    successRedirect: '/',
    failureRedirect: '/login'
}));
app.post('/loginForm', passport.authenticate('local', {
	successRedirect: '/',
	failureRedirect: '/login',
	failureFlash: true
}));
app.get('/login', function(req, res) {
	if (req.user) {
		res.render('main');
	} else {
		res.render('login');
	}
});
app.get('/buy', function(req, res) {
	if (req.user) {
		var buy = req.query.buy;
		var log;
		if (buy === "buy_1") {
			if (req.user.pearl >= 10) {
				log = Date()+" 10진주로 10,000골드 구매";
				User.update({_id : req.user._id}, {$inc : {gold : 10000, pearl : -10}, $push : {log_buy : log}}, function(err) {
					res.redirect('/main');
					return;
				});
			} else {
				res.send('<script>alert("진주가 부족합니다.");location.href="/main";</script>');
			}
		} else if (buy === "buy_2") {
			if (req.user.pearl >= 50) {
				log = Date()+" 50진주로 55,000골드 구매";
				User.update({_id : req.user._id}, {$inc : {gold : 55000, pearl : -50}, $push : {log_buy : log}}, function(err) {
					res.redirect('/main');
					return;
				});
			} else {
				res.send('<script>alert("진주가 부족합니다.");location.href="/main";</script>');
			}
		} else if (buy === "buy_3") {
			if (req.user.pearl >= 100) {
				log = Date()+" 100진주로 120,000골드 구매";
				User.update({_id : req.user._id}, {$inc : {gold : 120000, pearl : -100}, $push : {log_buy : log}}, function(err) {
					res.redirect('/main');
					return;
				});
			} else {
				res.send('<script>alert("진주가 부족합니다.");location.href="/main";</script>');
			}
		} else {
			res.send('<script>alert("잘못된 요청 입니다.");location.href="/main";</script>');
		}
	} else {
		res.render('login');
	}
});
//게임 전역 스키마 생성
var roomData = mongoose.Schema({
    name : {type : String},
    admin : {type : String},
    maxMember : {type : Number},
    full : {type : String},
    delete : {type : String},
    start : {type : String},
    turn : {type : String},
    member : {type : [String]},
    player_1 : {},
    player_2 : {},
    build : [],
    created_at : {type : Date, default : Date.now}
});
var Room = mongoose.model('roomData', roomData);
app.get('/main', function(req, res) {
	if (req.user) {
		User.find({_id : req.user._id}, {_id : 0, last_logout : 0, user_id : 0, user_pw : 0, __v : 0}, function(err, userValue) {
			Room.find({full : "no", delete : "no", member : req.user.user_nick}, function(err, roomValue) {
				res.render('main', {user:userValue[0], room:roomValue});
			});
		});
	} else {
		res.redirect('/login');
	}
});
//방만들기
app.post('/roomCreat', function(req, res) {
	var now = new Date();
 	now = dateToYYYYMMDDMMSS(now);
 	function dateToYYYYMMDDMMSS(date){
		function pad(num) {
			var num = num + '';
			return num.length < 2 ? '0' + num : num;
		}
		return date.getFullYear() + '-' + pad(date.getMonth()+1) + '-' + pad(date.getDate()) + 
		' ' + pad(date.getHours()) + ':' + pad(date.getMinutes()) + ':' + pad(date.getSeconds());
	}
	if (req.user) {
		var room = new Room({
    	name : now,
    	admin : req.user.user_nick,
		maxMember : 2,
		member : [req.user.user_nick],
    	player_1 : {nick : req.user.user_nick, gold : 100, energy : 10, action : 1},
    	player_2 : {nick : null, gold : 100, energy : 10, action : 1},
    	build : [{col : null, row : null, level : 0}],
		full : "no",
		delete : "no",
		start : "대기"
   	});
    room.save(function(err) {
        if (err) {
        	res.send('<script>alert("에러남");location.href="/join";</script>');
        	return console.error(err);
        }
        else res.send('<script>location.href="/";</script>');
    });
	} else {
		res.render('login');
	}
});
app.get('/room', function(req, res) {
	if (req.user) {
		var roomId = req.query.roomId;
		if (roomId != null) {
			Room.find({_id : roomId}, function(err, roomValue) {
				res.render('room', {room:roomValue[0], user:req.user});
				console.log(roomValue[0].board);
			});
		} else {
			res.send('<script>alert("잘못된 요청");location.href="/main";</script>');
		}
	} else {
		res.render('login');
	}
});
//참가하기
app.post('/joinRoom', function(req, res) {
	if (req.user) {
		var roomId = req.query.roomId;
		Room.update({_id : roomId}, {$push : {member : req.user.user_nick, player_2 : req.user.user_nick}}, function(err) {
			res.redirect('/room?roomId='+roomId);
		});
	} else {
		res.render('login');
	}
});
//나가기
app.post('/leaveRoom', function(req, res) {
	if (req.user) {
		var roomId = req.query.roomId;
		Room.update({_id : roomId}, {$pull : {member : req.user.user_nick, player_2 : req.user.user_nick}}, function(err) {
			res.redirect('/room?roomId='+roomId);
		});
	} else {
		res.render('login');
	}
});
//방폭
app.post('/deleteRoom', function(req, res) {
	if (req.user) {
		var roomId = req.query.roomId;
		Room.update({_id : roomId}, {$set : {delete : "yes"}}, function(err) {
			res.redirect('/main');
		});
	} else {
		res.render('login');
	}
});
//시작
app.post('/startRoom', function(req, res) {
	if (req.user) {
		var roomId = req.query.roomId;
		Room.update({_id : roomId}, {$set : {start : "진행 중", turn : req.user.user_nick}}, function(err) {
			res.redirect('/room?roomId='+roomId);
		});
	} else {
		res.render('login');
	}
});
