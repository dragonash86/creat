var express = require('express');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var session = require('express-session');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var NaverStrategy = require('passport-naver').Strategy;
var flash = require('connect-flash');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var Rndld = null;
app.use(express.static(__dirname + '/public'));
app.use(bodyParser.urlencoded({ extended: false }));
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
    User.update({ _id: req.user._id }, { $set: { last_logout: dateKTC } }, function(err) {
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
db.once("open", function() {
    console.log("DB connected!");
});
db.on("error", function(err) {
    console.log("DB ERROR :", err);
});
//서버 시작
server.listen(3000);


//socket.io


io.on('connection', function(socket) {
    //console.log('user connected: ', socket.id);
    if (Rndld !== null) {
        User.findOne({ user_nick: Rndld }, function(err, user) {
            console.log(Rndld);
            Rndld = null;
            io.to(user.socketID).emit('alert', "message");
        });
    }

    socket.on('send id', function(userNick) {
        User.findOneAndUpdate({ user_nick: userNick }, { $set: { 'socketID': socket.id } }, function(err) {});
    });
    /*
  socket.on('end turn', function(thisTurnUser){
	  //console.log(thisTurnUser);
	  console.log("이게 소켓 메시지");
	  User.findOne({user_nick : thisTurnUser}, function(err, user){
		  io.to(user.socketID).emit('alert', "message");
	  });
	  
  });
  */
    socket.on('hey', function(hey) {
        console.log(hey);
    });
    var name = "user";
    io.to(socket.id).emit('change name', name);
    socket.on('disconnect', function() {
        //console.log('user disconnected: ', socket.id);
    });
});

//유저전역 스키마 생성
var userData = mongoose.Schema({
    user_id: { type: String, unique: true },
    user_pw: { type: String },
    user_nick: { type: String, unique: true },
    lv: { type: Number },
    max_exp: { type: Number },
    exp: { type: Number },
    win: { type: Number },
    lose: { type: Number },
    gold: { type: Number },
    pearl: { type: Number },
    log: [String],
    log_buy: [String],
    read_log: [String],
    email: { type: String },
    sns: { type: String },
    created_at: { type: Date, default: Date.now },
    last_logout: { type: Date },
    socketID: { type: String, unique: true }
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
        user_id: req.body.userId,
        user_pw: req.body.userPw,
        user_nick: req.body.userNick,
        lv: 1,
        max_exp: 10,
        exp: 0,
        win: 0,
        lose: 0,
        gold: 0,
        pearl: 0,
        log: [],
        log_buy: [],
        read_log: [],
        email: "",
        sns: "",
        socketID: null
    });
    user.save(function(err) {
        if (err) {
            res.send('<script>alert("사용 중인 닉네임 또는 아이디 입니다.");location.href="/join";</script>');
            return console.error(err);
        } else res.send('<script>alert("가입 완료");location.href="/";</script>');
    });
});
//로그인
passport.serializeUser(function(user, done) {
    done(null, user);
});
passport.deserializeUser(function(user, done) {
    done(null, user);
});
passport.use(new LocalStrategy({ passReqToCallback: true }, function(req, username, password, done) {
    User.findOne({ user_id: username }, function(err, user) {
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
    res.render('account', { user: req.user });
});
passport.use(new NaverStrategy({
    clientID: "_SX5sVw5qJDBFgMAsJ8p",
    clientSecret: "JUbcQKTuCB",
    callbackURL: "/login/naver"
}, function(accessToken, refreshToken, profile, done) {
    User.findOne({ email: profile._json.email }, function(err, user) {
        if (!user) {
            var user = new User({
                lv: 1,
                max_exp: 10,
                exp: 0,
                win: 0,
                lose: 0,
                gold: 0,
                pearl: 0,
                log: [],
                log_buy: [],
                read_log: [],
                email: profile.emails[0].value,
                sns: "naver"
            });
            user.save(function(err) {
                if (err) console.log(err);
                return done(err, user);
            });
        } else {
            return done(err, user);
        }
    });

}));
app.get('/login/naver', passport.authenticate('naver'), function(req, res) {
    if (req.user.user_nick !== "") {
        res.render('main', { user: req.user });
    } else {
        res.render('join_nick', { user: req.user });
    }
});
app.get('/join_nick', function(req, res) {
    res.render('join_nick', { user: req.user });
});
app.post('/joinNickForm', function(req, res) {
    User.update({ _id: req.user._id }, { $set: { user_nick: req.body.userNick } }, function(err) {
        res.render('main', { user: req.user });
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
                log = Date() + " 10진주로 10,000골드 구매";
                User.update({ _id: req.user._id }, { $inc: { gold: 10000, pearl: -10 }, $push: { log_buy: log } }, function(err) {
                    res.redirect('/main');
                    return;
                });
            } else {
                res.send('<script>alert("진주가 부족합니다.");location.href="/main";</script>');
            }
        } else if (buy === "buy_2") {
            if (req.user.pearl >= 50) {
                log = Date() + " 50진주로 55,000골드 구매";
                User.update({ _id: req.user._id }, { $inc: { gold: 55000, pearl: -50 }, $push: { log_buy: log } }, function(err) {
                    res.redirect('/main');
                    return;
                });
            } else {
                res.send('<script>alert("진주가 부족합니다.");location.href="/main";</script>');
            }
        } else if (buy === "buy_3") {
            if (req.user.pearl >= 100) {
                log = Date() + " 100진주로 120,000골드 구매";
                User.update({ _id: req.user._id }, { $inc: { gold: 120000, pearl: -100 }, $push: { log_buy: log } }, function(err) {
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
    name: { type: String },
    admin: { type: String },
    maxMember: { type: Number },
    full: { type: String },
    delete: { type: String },
    start: { type: String },
    player: [],
    currentTurn: { type: Number },
    action: { type: Number },
    member: { type: [String] },
    player_1: {},
    player_2: {},
    build: [],
    boss: { type: Number },
    round: { type: Number },
    gameover: { type: Number },
    rmt: { type: Array },
    created_at: { type: Date, default: Date.now }
});
var Room = mongoose.model('roomData', roomData);

//랭킹 전역 스키마 생성
var rankingData = mongoose.Schema({
    user_nick: { type: String, unique: true },
    rank: { type: Number },
    win: {type: Number},
    lose: {type: Number},
    winRate: { type: Number }
});
var Rangking = mongoose.model('rankingData', rankingData);

app.get('/main', function(req, res) {
    if (req.user) {
        User.find({ _id: req.user._id }, { _id: 0, last_logout: 0, user_id: 0, user_pw: 0, __v: 0 }, function(err, userValue) {
            Room.find({ full: "no", delete: "no" }, function(err, roomValue) {
                res.render('main', { user: userValue[0], room: roomValue });
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

    function dateToYYYYMMDDMMSS(date) {
        function pad(num) {
            var num = num + '';
            return num.length < 2 ? '0' + num : num;
        }
        return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate()) +
            ' ' + pad(date.getHours()) + ':' + pad(date.getMinutes()) + ':' + pad(date.getSeconds());
    }
    if (req.user) {
        var room = new Room({
            name: now,
            admin: req.user.user_nick,
            maxMember: 2,
            member: [req.user.user_nick],
            player_1: { nick: req.user.user_nick, gold: 100, energy: 10, action: 1 },
            player_2: { nick: null, gold: 100, energy: 10, action: 1 },
            currentTurn: 1,
            action: 2,
            full: "no",
            delete: "no",
            start: "대기",
            boss: 100,
            round: 1,
            gameover: 0
        });
        for (var i = 0, row, col; i <= 100; i++) {
            row = parseInt(i / 10) + 1;
            col = i % 10;
            if (col === 0) {
                row -= 1;
                col = 10;
            }
            room.build[i] = { locIndex: i, level: 0, owner: null, row: row, col: col };
        }
        room.save(function(err) {
            if (err) {
                res.send('<script>alert("에러남");location.href="/join";</script>');
                return console.error(err);
            } else res.send('<script>location.href="/";</script>');
        });
    } else {
        res.render('login');
    }
});
app.get('/room', function(req, res) {
    if (req.user) {
        var roomId = req.query.roomId;
        if (roomId != null) {
            Room.find({ _id: roomId }, function(err, roomValue) {
                res.render('room', { room: roomValue[0], user: req.user });
                //console.log(roomValue[0].board);
                //console.log(roomValue[0]);
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
        Room.update({ _id: roomId }, { $push: { member: req.user.user_nick }, $set: { 'player_2.nick': req.user.user_nick } }, function(err) {
            res.redirect('/room?roomId=' + roomId);
        });
    } else {
        res.render('login');
    }
});
//나가기
app.post('/leaveRoom', function(req, res) {
    if (req.user) {
        var roomId = req.query.roomId;
        Room.update({ _id: roomId }, { $pull: { member: req.user.user_nick }, $set: { 'player_2.nick': null } }, function(err) {
            res.redirect('/room?roomId=' + roomId);
        });
    } else {
        res.render('login');
    }
});
//방폭
app.post('/deleteRoom', function(req, res) {
    if (req.user) {
        var roomId = req.query.roomId;
        Room.update({ _id: roomId }, { $set: { delete: "yes" } }, function(err) {
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

        Room.findOneAndUpdate({ _id: roomId }, { $set: { start: "진행 중" } }, function(err, roomValue) {
        	//턴 순서 정하고 플레이어 초기값 입력 저장
        	roomValue.member = DoShuffle(roomValue.member, roomValue.member.length);
            for (var max = roomValue.member.length, i = 0; i < max; i++) {
                Room.update({ _id: roomId }, { $push: { player: { nick: roomValue.member[i], gold: 100, energy: 10, incGold: 0, incEnergy: 0, damage: 0, score: 0, pass: false, BuildingBuiltThisTurn: 0 } } }, function(err) {});
            }

            //라운드 미션 타일 랜덤 배치
            var rmt = [1, 2, 3, 4, 5];
            rmt = DoShuffle(rmt, rmt.length);
            console.log(rmt);
            Room.update({ _id: roomId }, { $set: { rmt: rmt } }, function(err) {});

            res.redirect('/room?roomId=' + roomId);
        });
    } else {
        res.render('login');
    }
});
//생산
app.get('/produce', function(req, res) {
    if (req.user) {
        var roomId = req.query.roomId;
        var locIndex = parseInt(req.query.locIndex);
        var level = parseInt(req.query.level);
        var reqEnergy;
        var reqGold;
        var incGold;
        var incEnergy;
        var damage;

        if (level === 1) {
            reqGold = 10;
            reqEnergy = 2;
            incGold = 2;
            incEnergy = 2;
            damage = 2;
        } else if (level === 2) {
            reqGold = 20;
            reqEnergy = 3;
            incGold = 3 - 2;
            incEnergy = 3 - 2;
            damage = 3 - 2;
        } else if (level === 3) {
            reqGold = 50;
            reqEnergy = 5;
            incGold = 5 - 3;
            incEnergy = 5 - 3;
            damage = 5 - 3;
        }

        Room.findOne({ _id: roomId, build: { $elemMatch: { locIndex: locIndex } } }, { action: true, player_1: true, player_2: true, player: true, build: { $elemMatch: { locIndex: locIndex } } }, function(err, roomValue) {

            if ((req.user.user_nick === roomValue.build[0].owner) || (roomValue.build[0].owner === null) || (roomValue.build[0].owner === undefined)) {
                if (roomValue.action > 0) {
                    if (req.user.user_nick === roomValue.player[0].nick) {
                        var factor = { $set: { 'build.$.level': level, 'build.$.owner': req.user.user_nick } };
                        var factor2 = { $inc: { 'player.$.gold': -reqGold, 'player.$.energy': -reqEnergy, 'player.$.incGold': incGold, 'player.$.incEnergy': incEnergy, 'player.$.damage': damage, action: -1 } };
                        var currentEnergy = roomValue.player[0].energy;
                        var currentGold = roomValue.player[0].gold;
                    } else if (req.user.user_nick === roomValue.player[1].nick) {
                        var factor = { $set: { 'build.$.level': level, 'build.$.owner': req.user.user_nick } };
                        var factor2 = { $inc: { 'player.$.gold': -reqGold, 'player.$.energy': -reqEnergy, 'player.$.incGold': incGold, 'player.$.incEnergy': incEnergy, 'player.$.damage': damage, action: -1 } };
                        var currentEnergy = roomValue.player[1].energy;
                        var currentGold = roomValue.player[1].gold;
                    }
                    if (currentEnergy >= reqEnergy) {
                        if (currentGold >= reqGold) {
                            Room.findOneAndUpdate({ _id: roomId, build: { $elemMatch: { locIndex: locIndex } } }, factor, { new: true }, function(err, room) {
                                Room.findOneAndUpdate({ _id: roomId, player: { $elemMatch: { nick: req.user.user_nick } } }, factor2, function(err, room) {});
                                var row = parseInt(locIndex / 10);
                                var col = locIndex % 10

                                if (locIndex === 1) {
                                    //+1, +9, +10
                                    SLandS(room, roomId, req.user.user_nick, locIndex, 1);
                                    SLandS(room, roomId, req.user.user_nick, locIndex, 9);
                                    SLandS(room, roomId, req.user.user_nick, locIndex, 10);
                                } else if (locIndex === 10) {
                                    //-1, +9, +10
                                    SLandS(room, roomId, req.user.user_nick, locIndex, -1);
                                    SLandS(room, roomId, req.user.user_nick, locIndex, 9);
                                    SLandS(room, roomId, req.user.user_nick, locIndex, 10);
                                } else if (locIndex === 91) {
                                    //-10, -9, +1
                                    SLandS(room, roomId, req.user.user_nick, locIndex, -10);
                                    SLandS(room, roomId, req.user.user_nick, locIndex, -9);
                                    SLandS(room, roomId, req.user.user_nick, locIndex, 1);
                                } else if (locIndex === 100) {
                                    //-10,-11, -1
                                    SLandS(room, roomId, req.user.user_nick, locIndex, -11);
                                    SLandS(room, roomId, req.user.user_nick, locIndex, -10);
                                    SLandS(room, roomId, req.user.user_nick, locIndex, -1);
                                } else if (col === 0) {
                                    //-10, -11, -1, +9, +10
                                    SLandS(room, roomId, req.user.user_nick, locIndex, -11);
                                    SLandS(room, roomId, req.user.user_nick, locIndex, -10);
                                    SLandS(room, roomId, req.user.user_nick, locIndex, -1);
                                    SLandS(room, roomId, req.user.user_nick, locIndex, 9);
                                    SLandS(room, roomId, req.user.user_nick, locIndex, 10);
                                } else if (col === 1) {
                                    //-10, -9, +1, +10, +11
                                    SLandS(room, roomId, req.user.user_nick, locIndex, 11);
                                    SLandS(room, roomId, req.user.user_nick, locIndex, 10);
                                    SLandS(room, roomId, req.user.user_nick, locIndex, 1);
                                    SLandS(room, roomId, req.user.user_nick, locIndex, -9);
                                    SLandS(room, roomId, req.user.user_nick, locIndex, -10);
                                } else if (row === 0) {
                                    //-1, +1, +9, +10, +11
                                    SLandS(room, roomId, req.user.user_nick, locIndex, 11);
                                    SLandS(room, roomId, req.user.user_nick, locIndex, 10);
                                    SLandS(room, roomId, req.user.user_nick, locIndex, 1);
                                    SLandS(room, roomId, req.user.user_nick, locIndex, 9);
                                    SLandS(room, roomId, req.user.user_nick, locIndex, -1);
                                } else if (row === 9) {
                                    //-1, +1, -9, -10, -11
                                    SLandS(room, roomId, req.user.user_nick, locIndex, -11);
                                    SLandS(room, roomId, req.user.user_nick, locIndex, -10);
                                    SLandS(room, roomId, req.user.user_nick, locIndex, -9);
                                    SLandS(room, roomId, req.user.user_nick, locIndex, -1);
                                    SLandS(room, roomId, req.user.user_nick, locIndex, 1);
                                } else {
                                    //+1, -1, +9,10,11 -9,10,11
                                    SLandS(room, roomId, req.user.user_nick, locIndex, -11);
                                    SLandS(room, roomId, req.user.user_nick, locIndex, -10);
                                    SLandS(room, roomId, req.user.user_nick, locIndex, -9);
                                    SLandS(room, roomId, req.user.user_nick, locIndex, -1);
                                    SLandS(room, roomId, req.user.user_nick, locIndex, 1);
                                    SLandS(room, roomId, req.user.user_nick, locIndex, 9);
                                    SLandS(room, roomId, req.user.user_nick, locIndex, 10);
                                    SLandS(room, roomId, req.user.user_nick, locIndex, 11);
                                }
                                RMT(room, roomId, req.user.user_nick, level);
                                res.redirect('/room?roomId=' + roomId);
                            });
                        } else {
                            res.send('<script>alert("골드가 부족합니다.");location.href="/room?roomId=' + roomId + '";</script>');
                        }
                    } else {
                        res.send('<script>alert("에너지가 부족합니다.");location.href="/room?roomId=' + roomId + '";</script>');
                    }
                } else {
                    res.send('<script>alert("액션포인트가 부족합니다.");location.href="/room?roomId=' + roomId + '";</script>');
                }
            } else {
                res.send('<script>alert("생산할 수 없는 지역입니다.");location.href="/room?roomId=' + roomId + '";</script>');
            }
        });
    } else {
        res.render('login');
    }
});
//턴넘기기
app.post('/turnEnd', function(req, res) {
    if (req.user) {
        console.log('이게 턴엔드 메시지');
        var roomId = req.query.roomId;
        Room.findOne({ _id: roomId }, function(err, room) {
            room.currentTurn++;
            while (room.player[(room.currentTurn - 1) % room.member.length].pass) {
                room.currentTurn++;
            }
            console.log(room.currentTurn);
            Room.update({ _id: roomId }, { $set: { action: 2, currentTurn: room.currentTurn } }, function(err) {});
            Rndld = room.player[(room.currentTurn - 1) % room.member.length].nick;
            res.redirect('/room?roomId=' + roomId);
        });
    } else {
        res.render('login');
    }
});
//턴넘기기
app.get('/turnEnd', function(req, res) {
    if (req.user) {
        console.log('이게 턴엔드 메시지');
        var roomId = req.query.roomId;
        Room.findOne({ _id: roomId }, function(err, room) {
            room.currentTurn++;
            while (room.player[(room.currentTurn - 1) % room.member.length].pass) {
                room.currentTurn++;
            }
            console.log(room.currentTurn);
            Room.update({ _id: roomId }, { $set: { action: 2, currentTurn: room.currentTurn } }, function(err) {});
            Rndld = room.player[(room.currentTurn - 1) % room.member.length].nick;
            res.redirect('/room?roomId=' + roomId);
        });
    } else {
        res.render('login');
    }
});
//패스
app.post('/pass', function(req, res) {
    if (req.user) {
        var roomId = req.query.roomId;
        Room.findOneAndUpdate({ _id: roomId, player: { $elemMatch: { nick: req.user.user_nick } } }, { $set: { 'player.$.pass': true, action: 2 } }, { new: true }, function(err, room) {
            for (var i = 0, j = 0; i < room.player.length; i++) {
                if (!room.player[i].pass) {
                    j++;
                }
            }
            if (j === 0) {
                //라운드 종료
                for (var i = 0, damage = 0; i < room.player.length; i++) {
                    room.player[i].gold += room.player[i].incGold;
                    room.player[i].energy += room.player[i].incEnergy;
                    room.player[i].pass = false;
                    damage += room.player[i].damage;
                }
                console.log(room.round, "라운드")
                if ((room.boss - damage) <= 0) {
                    Room.update({ _id: roomId }, { $set: { gameover: 1 } }, function(err) {});
                    Ranking.update({ user_nick : req.user },{$inc :{ win : 1}}, function(err){});
                } else if (room.round > 4) {
                    Room.update({ _id: roomId }, { $set: { gameover: -1 } }, function(err) {});
                    Ranking.update({ user_nick : req.user },{$inc :{ lose : 1}}, function(err){});
                }
                Room.update({ _id: roomId }, { $set: { player: room.player }, $inc: { round: 1, boss: -damage } }, function(err) {});
            }
            console.log(room.player);
            res.redirect('/turnEnd?roomId=' + roomId);
        });
    } else {
        res.render('login');
    }
});

//파워
function SLandS(room, roomId, user_nick, locIndex, n) { 
    if (room.build[locIndex + n].owner !== null && room.build[locIndex + n].owner !== user_nick) {
        if (room.build[locIndex + n].level == 1) {
            var bonEnergy = 2;
        } else if (room.build[locIndex + n].level == 2) {
            var bonEnergy = 3;
        } else if (room.build[locIndex + n].level == 3) {
            var bonEnergy = 5;
        }
        Room.update({ _id: roomId, player: { $elemMatch: { nick: room.build[locIndex + n].owner } } }, { $inc: { 'player.$.energy': bonEnergy } }, function(err) {});
        console.log(room.build[locIndex + n].owner, "는 파워를 받으라", room.build[locIndex + n].owner !== room.build[locIndex].owner, user_nick, room.build[locIndex + n].owner);
    }
}

//라운드 미션 타일
function RMT(room, roomId, user_nick, level) {
    if (room.rmt[room.round - 1] === 1) {
        //1단계 대포를 지으면 지을 때마다 3점
        if (level === 1) {
            Room.update({ _id: roomId, player: { $elemMatch: { nick: user_nick } } }, { $inc: { 'player.$.score': 3 } }, function(err) {});
        }
    } else if (room.rmt[room.round - 1] === 2) {
        //2단계 대포를 지으면 지을 때마다 3점
        if (level === 2) {
            Room.update({ _id: roomId, player: { $elemMatch: { nick: user_nick } } }, { $inc: { 'player.$.score': 3 } }, function(err) {});
        }
    } else if (room.rmt[room.round - 1] === 3) {
        //3단계 대포를 지으면 지을 때마다 5점
        if (level === 3) {
            Room.update({ _id: roomId, player: { $elemMatch: { nick: user_nick } } }, { $inc: { 'player.$.score': 5 } }, function(err) {});
        }
    } else if (room.rmt[room.round - 1] === 4) {
        //20 데미지 달성 시 10점(미구현)
        /*
        for (var i = 0; i < room.player.length ; i++) {
        	if ( room.player[i].nick === user_nick ) {
        		if (room.player[i].damage >= 20) {
        			Room.update({_id : roomId, player : {$elemMatch : {nick : user_nick}}}, {$inc : {'player.$.score' : 10}}, function(err){});
        		}
        		break;
        	}
        }
        */
    } else if (room.rmt[room.round - 1] === 5) {
        //건물 5개 지으면 10점
        for (var i = 0; i < room.player.length; i++) {
            if (room.player[i].nick === user_nick) {
                room.player[i].BuildingBuiltThisTurn++;
                Room.update({ _id: roomId, player: { $elemMatch: { nick: user_nick } } }, { $inc: { 'player.$.BuildingBuiltThisTurn': 1 } }, function(err) {});
                if (room.player[i].BuildingBuiltThisTurn === 5) {
                    Room.update({ _id: roomId, player: { $elemMatch: { nick: user_nick } } }, { $inc: { 'player.$.score': 10 } }, function(err) {});
                }
                break;
            }
        }
    }
    console.log("RMT(", room.rmt[room.round - 1], ")실행");
}

//셔플 알고리즘 : Fisher–Yates Shuffle 
//Doshuffle(셔플할 배열, 배열의 길이)
function DoShuffle(xArray, xLength)
{
	for (var i = 0, j, temp; i < xLength; i++) {
		j = Math.floor(Math.random() * (xLength - i));
		temp = xArray[i];
		xArray[i] = xArray[i+j];
		xArray[i+j] = temp;
	}
	return xArray;
}
