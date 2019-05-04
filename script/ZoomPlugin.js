(function(window) {
	var options = {
		data: [], //数据
		label: false, //是否启用标注
		initScaleSize: 50, //最初显示比例
		scaleSize: 50, //当前缩放比例
		maxScaleSize: 2, //最大缩放比例
		proportion: 0.05, //每次增减的大小比例
	};
	
	//缩放图片
	var ZoomPlugin = function(obj) {
		this.el = $(obj.el), //容器
			this.elWrap = this.el.find(".mapInfo"), //地图容器
			this.mapImg = this.el.find(".mapImg"), //地图图片
			this.label = obj.label || options.label,
			this.startX,
			this.startY, //初始位置
			this.moveX,
			this.moveY, //移动位置
			this.resultX = 0,
			this.resultY = 0, //每帧移动距离
			this.currX,
			this.currY, //当前位置
			this.mapW = this.el.width(), //容器宽度
			this.mapH = this.el.height(), //容器高度
			this.initTotalW,
			this.initTotalH,
			this.totalW, //当前地图的宽度
			this.totalH, //当前地图的高度
			this.zoomLeft = this.elWrap.offset().left,
			this.zoomTop = this.elWrap.offset().top;
		if(this.label) {
			this.markCon = this.el.find(".mapMark"),
				this.marks = this.markCon.children(),
				this.zoomMask = this.el.find(".zoomMask"),
				this.zoomMaskClose = this.el.find(".zoomMaskClose"),
				this.data = obj.data || options.data;
		}
		this.zoomInBtn = $(".zoom_in"),
			this.zoomOutBtn = $(".zoom_out"),
			this.zoomZeroBtn = $(".zoom_zero"),
			this.zoomFitBtn = $(".zoom_fit"),
			this.zoomStatus = $(".zoom_status"),
			this.zoomLoading = $(".zoomLoading");

		this.scaleSize = (obj.initScaleSize / 100) || options.scaleSize, //当前缩放比例
			this.maxScaleSize = (obj.maxScaleSize / 100) || options.maxScaleSize, //最大缩放比例
			this.proportion = (obj.proportion / 100) || options.proportion; //每次增减的大小比例

		var img = new Image();
		var _this = this;
		img.onload = function() {
			_this.initTotalW = this.width;
			_this.initTotalH = this.height;

			_this.minScaleSize = parseFloat((_this.mapW / _this.initTotalW));

			if(_this.scaleSize < _this.minScaleSize) {
				_this.scaleSize = _this.minScaleSize;
			}

			if(_this.data) {
				_this.timer = new Date().getTime();
				_this.ordered(_this.data, {
					each: function(curr, len) {
						//console.log(parseInt(curr/len * 100)+"%")
					},
					end: function() {
						_this.init();
					}
				});
			} else {
				_this.init();
			}
		}
		img.src = this.mapImg.get(0).src;
	};

	ZoomPlugin.prototype = {
		constructor: ZoomPlugin,
		//初始化
		init: function() {
			var _this = this;
			this.initPosition();
			this.createMark(this.data);

			this.onmousemove = this.onmouse.mousemove.bind(this);
			
			// 绑定监听
			this.elWrap.on("mousedown", this.onmouse.mousedown.bind(this));
			this.elWrap.on("mouseup", this.onmouse.stopMove.bind(this));
			this.elWrap.on("mouseout", this.onmouse.stopMove.bind(this));
			this.elWrap.mousewheel(this.onmouse.mousewheel.bind(this));
			this.zoomInBtn.on("click", this.zoomIn.bind(this));
			this.zoomOutBtn.on("click", this.zoomOut.bind(this));
			this.zoomFitBtn.on("click", this.zoomFit.bind(this));
			this.zoomZeroBtn.on("click", this.zoomZero.bind(this));
			
			// 判断是否启用标注功能
			if(this.label) {
				this.markCon.on("click", this.markClick.bind(this));
				this.zoomMaskClose.on("click", function() {
					_this.zoomMask.fadeOut(300);
				});
			}
			
			// 隐藏loading
			this.zoomLoading.fadeOut(300)
		},
		//初始化位置
		initPosition: function() { //初始化图片位于容器的位置
			if(this.scaleSize === 0) {
				if(this.mapW / this.mapH > this.initTotalW / this.initTotalH) {
					this.totalW = this.initTotalW;
					this.totalH = this.initTotalH * this.initTotalW / this.initTotalW;
					this.resultX = 0;
					this.resultY = -(this.totalH - this.initTotalH) / 2;
					this.scaleSize = this.initTotalW / this.initTotalW;
				} else {
					this.totalW = this.initTotalW * this.mapH / this.initTotalH;
					this.totalH = this.initTotalH;
					this.resultX = -(this.totalW - this.initTotalW) / 2;
					this.resultY = 0;
					this.scaleSize = this.initTotalH / this.imgH;
				}
			} else {
				this.totalW = this.initTotalW * this.scaleSize;
				this.totalH = this.initTotalH * this.scaleSize;
				this.resultX = -((this.totalW - this.mapW) / 2);
				this.resultY = -((this.totalH - this.mapH) / 2);
			}

			this.mapImg.css({
				"width": this.totalW,
				"height": this.totalH,
				"left": this.resultX,
				"top": this.resultY
			});
			this.markCon.css({
				"width": this.totalW,
				"height": this.totalH,
				"left": this.resultX,
				"top": this.resultY
			});
			this.zoomStatus.text(parseInt(this.scaleSize * 100) + "%");
		},
		//增大
		zoomIn: function() {
			this.zoom({
				num: this.proportion
			});
		},
		//缩小
		zoomOut: function() {
			this.zoom({
				num: -this.proportion
			});
		},
		//1:1缩放
		zoomZero: function() {
			var set = 1;
			this.zoomFitBtn.addClass("small");
			this.zoom({
				set: set
			});
		},
		//初始大小和全屏大小
		zoomFit: function() {
			var set = 0;
			if(this.zoomFitBtn.hasClass("small")) {
				this.zoomFitBtn.removeClass("small");
				set = this.minScaleSize;
			} else {
				this.zoomFitBtn.addClass("small");
				set = 1;
			}
			this.zoom({
				set: set
			});
		},
		//创建标注
		createMark: function(data) {
			var html = "";
			for(var i = 0, len = data.length; i < len; i++) {
				html += "<span class='mark' style='left:" + ((data[i].x / this.initTotalW) * 100) + "%; top:" + ((data[i].y / this
						.initTotalH) * 100) + "%;'  data-id='" + data[i].id + "' data-column='" + data[i].column + "' data-title='" +
					data[i].title + "' title='" + data[i].title + "' data-txt='" + data[i].txt + "'  data-img='" + data[i].img +
					"' data-color='" + data[i].color + "'></span>";
			}
			this.markCon.html(html);
			this.marks = this.markCon.children();
		},
		//标注点击事件
		markClick: function(e) {
			var e = e || window.event;
			e.preventDefault();

			var _this = this;
			var img = new Image();

			if(e.target.nodeName === "SPAN" && e.target.className.indexOf("mark") > -1) {
				var id = $(e.target).attr("data-id");
				var column = $(e.target).attr("data-column");
				var title = $(e.target).attr("data-title");
				var txt = $(e.target).attr("data-txt");
				var imgSrc = $(e.target).attr("data-img");
				var color = $(e.target).attr("data-color");
				this.zoomMask.find(".zoomColumn").text(column);
				this.zoomMask.find(".zoomId").text(id);
				this.zoomMask.find(".zoomId").css("background", color);
				this.zoomMask.find(".zoomTitle").text(title);
				this.zoomMask.find(".zoomTxt").text(txt.replace(/<.*?>/ig, "")); //清除包含文字的标签
				this.zoomMask.find(".zoomImg").attr("src", imgSrc);
				if(imgSrc !== "" && (imgSrc.indexOf("jpeg") > -1 || imgSrc.indexOf("JPEG") > -1 || imgSrc.indexOf("jpg") > -1 ||
						imgSrc.indexOf("JPG") > -1 || imgSrc.indexOf("png") > -1 || imgSrc.indexOf("PNG") > -1 || imgSrc.indexOf("gif") >
						-1 || imgSrc.indexOf("GIF") > -1)) {
					this.zoomMask.find(".zoomImg").show();
				} else {
					this.zoomMask.find(".zoomImg").hide();
				}

				var maskW = this.zoomMask.width() + 16;
				var maskH = this.zoomMask.height() + 16;

				this.zoomMask.css({
					"margin-left": -(maskW / 2),
					"margin-top": -(maskH / 2)
				});

				_this.zoomMask.fadeIn(500);
			}
		},
		//监听事件
		onmouse: {
			mousedown: function(e) {
				var e = e || window.event;
				e.preventDefault();
				this.startX = e.clientX - this.zoomLeft;
				this.startY = e.clientY - this.zoomTop;
				$(document).on("mousemove", this.onmousemove);
			},
			mousemove: function(e) {
				var e = e || window.event;
				e.preventDefault();
				this.moveX = e.clientX - this.zoomLeft;
				this.moveY = e.clientY - this.zoomTop;

				this.currX = parseInt(this.mapImg.css("left"));
				this.currY = parseInt(this.mapImg.css("top"));

				this.resultX = this.currX + (this.moveX - this.startX);
				this.resultY = this.currY + (this.moveY - this.startY);

				this.limit();

				this.mapImg.css({
					"left": this.resultX,
					"top": this.resultY
				});
				this.markCon.css({
					"left": this.resultX,
					"top": this.resultY
				});

				this.startX = this.moveX;
				this.startY = this.moveY;
			},
			stopMove: function(e) {
				var e = e || window.event;
				e.preventDefault();
				this.startX = 0;
				this.startY = 0;
				this.moveX = 0;
				this.moveY = 0;
				$(document).off("mousemove", this.onmousemove);
			},
			mousewheel: function(e) {
				var e = e || window.event;
				e.preventDefault();

				var x = e.pageX - this.zoomLeft;
				var y = e.pageY - this.zoomTop;

				var num = "";
				if(e.originalEvent.detail) {
					num = -((e.originalEvent.detail) / 30) * 10 * this.proportion;
				} else {
					num = ((e.originalEvent.wheelDelta) / 1200) * 10 * this.proportion;
				}

				this.zoom({
					x: x,
					y: y,
					num: num
				})
			}
		},
		// 控制缩放
		zoom: function(obj) {
			var x = obj.x || this.mapW / 2;
			var y = obj.y || this.mapH / 2;

			var ns = this.scaleSize;
			if(obj.set) {
				ns = obj.set;
			} else {
				ns = parseInt((ns + obj.num) * 100) / 100;
			}

			ns = ns < this.minScaleSize ? this.minScaleSize : (ns > this.maxScaleSize ? this.maxScaleSize : ns);

			//计算位置，以鼠标所在位置为中心
			//以每个点的x、y位置，计算其相对于图片的位置，再计算其相对放大后的图片的位置
			//图片当前偏移位置  = 图片过去偏移位置 - ((鼠标位于容器的位置 - 图片过去偏移位置) * ((当前缩放比例 - 过去缩放比例) / 过去缩放比例))
			//(鼠标位于容器的位置 - 图片过去偏移位置): 获取当前鼠标位于图片Top/Left 距离
			//(当前缩放比例 - 过去缩放比例): 获取增加的比例
			//(当前缩放比例 - 过去缩放比例) / 过去缩放比例): 获取增加比例对于过去比例的比例
			//((当前缩放比例 - 过去缩放比例) / 过去缩放比例)): 偏移的值
			this.resultX = this.resultX - ((x - this.resultX) * ((ns - this.scaleSize) / this.scaleSize));
			this.resultY = this.resultY - ((y - this.resultY) * ((ns - this.scaleSize) / this.scaleSize));
			this.scaleSize = ns; //更新倍率
			this.totalW = this.initTotalW * ns;
			this.totalH = this.initTotalH * ns;

			if(this.scaleSize < 1) {
				this.zoomFitBtn.removeClass("small");
			}

			this.limit();

			this.mapImg.css({
				"width": this.totalW,
				"height": this.totalH,
				"left": this.resultX,
				"top": this.resultY
			});
			this.markCon.css({
				"width": this.totalW,
				"height": this.totalH,
				"left": this.resultX,
				"top": this.resultY
			});

			this.zoomStatus.text(parseInt(this.scaleSize * 100) + "%");
		},
		//限制图片出现留白
		limit: function() {
			if(this.resultX >= 0) {
				this.resultX = 0;
			} else if(this.resultX < this.mapW - this.totalW) {
				this.resultX = this.mapW - this.totalW;
			}
			if(this.resultY >= 0) {
				this.resultY = 0;
			} else if(this.resultY < this.mapH - this.totalH) {
				this.resultY = this.mapH - this.totalH;
			}
		},
		//监听图片加载事件
		ordered: function(data, options) {
			var _this = this,
				imgs = [],
				count = 0,
				minTimer = 0;
			for(var i = 0, len = data.length; i < len; i++) {
				if(data[i].img !== "") {
					imgs.push(data[i].img)
				}
			}
			var len = imgs.length;

			var load = function() {
				var img = new Image();
				img.onload = function() {
					options.each && options.each(count, len);
					if(count >= len - 1) {
						var timeCount = new Date().getTime() - _this.timer;
						if(timeCount < minTimer) {
							var timeout = minTimer - timerCount;
							setTimeout(function() {
								options.end && options.end();
							}, timeout)
						} else {
							options.end && options.end();
						}
					} else {
						load();
					}

					count++;
				}

				img.src = imgs[count];
			}

			load();
		}
	}
	
	window.ZoomPlugin = ZoomPlugin;

	/*检测bind是否存在，不存在则添加bind方法*/
	if(!Function.prototype.bind) {
		Function.prototype.bind = function(oThis) {
			if(typeof this !== "function") {
				throw new TypeError("Function.prototype.bind - what is trying to be bound is not callable");
			}
			var aArgs = Array.prototype.slice.call(arguments, 1),
				fToBind = this,
				fNOP = function() {},
				fBound = function() {
					return fToBind.apply(
						this instanceof fNOP && oThis ? this : oThis || window,
						aArgs.concat(Array.prototype.slice.call(arguments))
					);
				};
			fNOP.prototype = this.prototype;
			fBound.prototype = new fNOP();
			return fBound;
		};
	}
})(window);