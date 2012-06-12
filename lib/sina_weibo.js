var phantom = require('phantom');
/*
phantom.create ('--cookies-file=cookie2.txt', function(ph){
    ph.get('version', function(info){
        console.log(info);
    });


    ph.createPage(function(page){
        page.get('settings.loadImages', function(info){
            console.log(info);
        });

        page.open("http://www.weibo.com", function(status){
            //console.log("opened google? " + status);
            if(status=="success") {
                page.injectJs('jquery-1.7.2.min.js');
                page.evaluate(function(){
                    $("#login_form input.name").val('18602283721');
                    $("#login_form input.pass").val('113456');
                    //$("#login_form div.W_login div.btn a.W_btn_d").trigger('click');
                    var ev = document.createEvent('MouseEvents');
                    ev.initEvent('click', false, true);
                    $(".W_btn_d")[0].dispatchEvent(ev);

                    return document.title+$(".W_btn_d").text();
                }, function(result){
                    console.log(result);
                    ph.exit();
                });
            }

        });

    });
});
*/

var WeiboSinaFactory = {
    create : function(username, password, config, callback){
        phantom.create('--cookies-file=cookie2.txt', function(ph){
            ph.createPage(function(page){
                page.set('settings.loadImages', false);
                callback(new WeiboSina(username, password, page, ph, config));
            });
        });
    }
};

function WeiboSina(username, password, page, ph, config) {
    var _self = this;
    var _is_login = false;
    var _open_list = [];
    var _is_openning = false;

    page.set('onConsoleMessage', function (msg) {
        console.log('onConsoleMessage:'+msg);
    });
    page.set('onLoadFinished', function (msg) {
        //console.log('onLoadFinished');
    });
    page.set('onResourceRequested', function (msg) {
        //console.log('onResourceRequested');
    });

    _self.open = function(url, callback){
        if(_is_login==true && _is_openning==false) {
            _is_openning = true;
            console.log('open url:'+url);
            var is_call = false;
            page.open(url, function(status){
                if(status=='success') {
                    if(is_call==true) {
                        return;
                    }
                    is_call = true;
                    page.injectJs('script/jquery-1.7.2.min.js');
                    console.log('opened url:'+url);

                    callback({
                        evaluate : function(evaluate,cb){
                            return page.evaluate(evaluate,cb);
                        }
                    }, function(){
                        _is_openning = false;
                        _openNext();
                    });
                }
                else {
                    //retry
                    _is_openning = false;
                    console.log('open url fail:'+url);
                }
            })
        }
        else {
            console.log('加入队列');
            _pushToOpenList(url, callback);
        }
    }

    function _openNext() {
        console.log('Open Next URL:'+_open_list.length);
        if(_is_openning==false) {
            var obj;
            if(obj=_open_list.shift()) {
                console.log(obj);
                _self.open(obj.url, obj.callback);
            }
        }
    }

    //登录
    function _doLogin(callback) {
        console.log('begin _doLogin\n');
        //page.injectJs('jquery-1.7.2.min.js');
        var fstr = "window.xusername = '"+username+"'; window.xpassword = '"+password+"';";
        var f = new Function(fstr);
        page.evaluate(f, function(){
            console.log("设置用户名，密码。");
        });

        page.evaluate(function(){
            try {
                $("#login_form input.name").val(window.xusername);
                $("#login_form input.pass").val(window.xpassword);
                var ev = document.createEvent('MouseEvents');
                ev.initEvent('click', false, true);
                $(".W_btn_d")[0].dispatchEvent(ev);

                return "none";
            }
            catch(e) {
                return e;
            }

            //return $("#login_form").html();
            return 'ddd';
        }, function(result){
            console.log('-------------');
            console.log(result);
            setTimeout(function(){
                _isLogin(callback);
            }, 2000);
            //ph.exit();
        });
    }

    //判断是否登录
    function _isLogin(callback) {
        console.log('call _isLogin.');

        var is_callbacked = false;
        page.open("http://weibo.com", function(status){
            //console.log("opened google? " + status);
            if(is_callbacked==true) {
                return;
            }
            is_callbacked = true;
            if(status=="success") {
                page.injectJs('script/jquery-1.7.2.min.js');
                page.evaluate(function(){
                    //return $(".W_btn_d").text();
                    try {
                        return $(".W_btn_d")[0].tagName=="A";
                    }
                    catch(e) {
                        return false;
                    }
                }, function(result){
                    console.log(result);
                    //如果有登录提示
                    if(result==true) {
                        _doLogin(callback);
                    }
                    else {
                        _is_login = true;
                        console.log(result+'+++++++++++++');

                        callback('_isLogin');
                    }

                    //ph.exit();
                });
            }
            else {
                console.log('_isLogin:Fail.');
            }

        });
    }

    function _pushToOpenList(url, callback) {
        _open_list.push({
            url : url,
            callback : callback
        });
    }

    _isLogin(function(){
        _is_login = true;
        console.log('登录成功');

        setInterval(function(){
            _openNext();
        }, config.check_interval);

        setInterval(function(){
            _self.open('http://weibo.com', function(){
                return "";
            },function(result){
                //do nothing.
            });
        }, config.breakheart);
    });
}

exports.WeiboSinaFactory = WeiboSinaFactory;