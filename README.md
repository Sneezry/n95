# N95口罩库存

为了保证货源可信度，只接受B2C平台官方自营链接，包括京东自营、品牌天猫旗舰店、亚马逊自营、当当自营、网易严选自营等等。为了排除利益相关，不接受带有返利的链接。

## 开源协议

MIT

## 附加协议

衍生作品中如果有展示非上述提到的官方渠道链接或者链接中带有返利，必须在页面的显著位置进行标注。

# 在 Docker 中运行
## 构建镜像
```
docker build -t n95 .
```
## 运行容器
在当前目录下准备好`data.json`并运行
```
docker run --rm -itv /path/to/data.json:/n95/data.json n95
```
