var WeiboSinaFactory = require('./lib/sina_weibo').WeiboSinaFactory;
var config = require('./config/config').config;

WeiboSinaFactory.create(config.username, config.password, config.page_size, {
    "check_interval":config.check_interval,
    "breakheart":config.breakheart
}, function(weibo){
    console.log('create a weibo client.');
    var app = require('express').createServer();

    //测试
    app.get('/u/:id', function(req, res){
        weibo.open("http://weibo.com/"+req.params.id, function(obj, nextPage){
            setTimeout(function(){
                obj.evaluate(function(){
                    try {
                        //return $('.W_person_info dd a').text();
                        return $(".user_atten").text();
                    }
                    catch(e) {
                        return "-";
                    }
                }, function(result){
                    //res.writeHead(200, {'Content-Type': 'text/plain'});
                    console.log(result);
                    res.send(result);

                    nextPage();
                });
            }, 3000);
        });
    });

    //检测帐号是否可用
    app.get('/valid/:id', function(req, res){
        weibo.open("http://weibo.com/"+req.params.id, function(obj, nextPage){
            obj.evaluate(function(){
                try {
                    //return $('.W_person_info dd a').text();
                    return $(".page_error .note p").text();
                }
                catch(e) {
                    return "-";
                }
            }, function(result){
                //res.writeHead(200, {'Content-Type': 'text/plain'});
                console.log(result);
                if(result=='抱歉，您当前访问的帐号异常，暂时无法访问。') {
                    res.send('2');
                }
                else {
                    res.send('1');
                }

                nextPage();
            });
        });
    });

    app.get('/home', function(req, res){
        weibo.open("http://weibo.com/u/2067078335", function(){
            try {
                return $('.user_atten').text();
            }
            catch(e) {
                return "-";
            }

            return $('body').html()
        }, function(result){
            res.send(result);
        });
    });

    app.listen(config.port);
});