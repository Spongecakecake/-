# 插旗体系 V1 接口与交付说明

## 1. 范围

本期按 PRD v1.0 的 V1 全量实现：插旗、旗场、旗面、站队、结局/复活、积分、信任分、举证 L1/L2（上传图片加水印模拟）、分享卡、运营后台与八项指标埋点。

明确排除：宿敌对决 V2、存疑标记/验旗挑战 V1.5、AI 图像识别 V2、第三方数据授权 V2、机构成绩单 V2、积分兑现/转让/现金化、匿名站队、人脸/生物特征验证、公开信息流盖楼 V2。

## 2. 数据文件

- `data/flags.json`：旗实体与状态快照
- `data/standings.json`：护旗/拔旗留言、审核状态
- `data/points.json`：余额、冻结额、流水、库存、免战盾
- `data/trust.json`：信任分、处罚、申诉、连败记录
- `data/proofs.json`：举证请求与证据元数据
- `data/moderation.json`：审核队列、举报、操作日志
- `data/metrics.json`：埋点事件与聚合缓存
- `data/featureFlags.json`：功能开关与精选位
- `storage/proofs/`：私有证据文件，不通过静态目录暴露

所有集合沿用 `db.js` 的 JSON 原子写入；新增集合缺失时会自动初始化为空数组或空对象。

## 3. 主要接口

### 旗

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| POST | `/api/flags/plant` | 由公开目标生成旗；`privacy=public`，`proofLevel=L1\|L2` |
| GET | `/api/flags/field?tab=hot\|latest\|ending&limit=50` | 旗场列表；热门排除 L1 自证旗 |
| GET | `/api/flags/mine` | 我的旗 |
| GET | `/api/flags/:id` | 旗面详情；私密旗仅旗主可见 |
| GET | `/api/flags/:id/card` | 战况卡数据，主角端无红营庆祝文案 |
| POST | `/api/flags/:id/privacy` | 转公开/私密 |
| POST | `/api/flags/:id/pull` | 开/关拔旗；高危旗禁开 |
| POST | `/api/flags/:id/revive` | 复活窗内消耗重启券，换新旗并归档旧留言 |

状态：`pending | active | fallen | achieved | closed | void`。旗落进入 7 天复活窗；复活后旧旗结算分按护旗翻倍、拔旗减半重算。

### 站队

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/standings/templates` | 30 条官方模板，三类 |
| POST | `/api/standings` | 护旗/拔旗留言；自定义拔旗文案先审后发 |
| GET | `/api/standings/flag/:flagId` | 旗面留言；拔旗关闭时不返回红营留言 |
| GET | `/api/standings/mine` | 我的留言，含审核中 |
| POST | `/api/standings/:id/feature` | 旗主收进旗帜，最多 10 条/旗 |
| POST | `/api/standings/:id/poke` | 戳到我，3 次/旗/日 |
| POST | `/api/standings/:id/report` | 举报；不成立 3 次/月暂停举报 30 天 |

规则：每旗每日一次站队；注册未满 7 天计入威胁值但不计入积分；同设备簇 ≥3 账号仅最早账号计入积分；金额/转账类自定义拔旗文案直接拦截。

### 积分、信任、举证、运营

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/points/summary`、`/api/points/ledger` | 余额、结算中、流水三态 |
| GET | `/api/points/shop`、`/api/points/leaderboard?side=defend\|tempt` | 商店、排行榜（L1 不计数） |
| POST | `/api/points/shop/buy`、`/api/points/shop/use-shield` | 兑换、免战盾 |
| GET | `/api/trust/me` | 信任分、处罚、申诉 |
| POST | `/api/trust/appeal` | 申诉，48h SLA |
| GET | `/api/proofs/status?flagId=` | 仅返回已举证状态，不返回证据地址 |
| POST | `/api/proofs/request`、`/api/proofs/submit` | 点验请求、L2 水印图举证 |
| GET | `/api/proofs/:id/file` | 鉴权读取证据：旗主/见证人/运营 |
| GET/POST | `/api/admin/overview`、`/api/admin/feature-flags`、`/api/admin/featured` | 运营配置 |
| GET/POST | `/api/admin/moderation`、`/api/admin/moderation/:id` | 审核队列与处置 |
| GET/POST | `/api/admin/reports/:id`、`/api/admin/appeals/:id`、`/api/admin/official` | 举报、申诉、官方号 |
| GET | `/api/admin/metrics`、`/api/events/summary` | 八项指标与告警 |

运营权限：用户名字段命中 `ZUODAO_ADMINS`（默认 `admin,运营,risk`）或 `user.isAdmin=true`。

## 4. 埋点字段

关键事件：`flag_view`、`flag_plant`、`defend_send`、`tempt_send`、`flag_result`、`flag_revive`、`flag_optout_pull`、`proof_request`、`proof_submit`、`user_return`、`trust_change`。

`defend_send` / `tempt_send` 记录 `flagId`、`userId`、`content_type`、`word_count`、`template_id`，用于响应时长、渗透率与摩擦流失指标。不记录图片内容、token 或敏感个人信息。

## 5. 验收清单

- [x] 插旗、旗场、旗面、旗落与复活页可访问，二级页面均可返回
- [x] 30 条官方模板、三类分组、免责角标
- [x] 自定义拔旗文案审核与金额拦截
- [x] 每旗每日一次、7 天新号不计分、设备簇聚类
- [x] 成色乘数 0.5 / 0.8 / 1.2，T+7 发放，L1 不进榜单
- [x] 复活重算、免战盾、连败保护、高危禁拔
- [x] L2 上传图片 + 水印模拟、私有存储与鉴权读取
- [x] 信任分、实锤清零、申诉复核
- [x] 战况卡/喜报卡文案
- [x] 运营开关、精选、审核、举报、八项指标与红线告警
- [x] Node 测试 5 组全部通过；本地 API 冒烟通过

## 6. 上线与回滚

上线沿用 `zuodao-alibaba-deploy` 技能：构建 Web 产物、打包 server、`scp` 上传、`python3 zipfile` 解压、pm2 重启。脚本会先备份 `data/` 到 `/root/zuodao-data-backup-<时间戳>` 并恢复，避免数据被本地旧数据覆盖。

回滚策略：

1. 保留上一版 `/root/zuodao` 目录与 pm2 进程列表快照。
2. 若新版本异常，停止 `zuodao-api` / `zuodao-web`，从备份恢复 `server/data`，重启上一版产物。
3. 功能级回滚优先使用 `featureFlags.json`：关闭 `pull`、`pointsShop`、`shareCard` 或 `flagsField`，无需代码回滚。
4. 红线触发（免战/关闭率 >8% 持续一周、失败用户 7 日回访低于基线）时先关闭对应功能开关，再做数据复盘。
