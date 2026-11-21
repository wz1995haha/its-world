/* writer.js — 「它眼里的世界」日记引擎
 * 输入：宠物档案 + 某一天的事实
 * 输出：一篇它自己写的日记（第一人称、可复现、不重复）
 */
(function () {
  'use strict';
  var PT = (window.PT = window.PT || {});

  /* ---------------- 词库 ---------------- */

  var LEX = {
    open: [
      '天还没亮的时候，我已经把整个屋子走了一遍。你还在睡，我不敢踩那块会响的地板。',
      '光从窗帘的缝里挤进来，先落在你的被子上，再落在我身上。',
      '今天醒来第一件事，是确认你还在。',
      '楼下有些动静，我听了很久，确认那不是你的脚步。',
      '你出门的时候我坐在门口。门关上了，我又坐了一会儿。',
      '今天的空气闻起来是湿的。我不喜欢湿，但我喜欢窗边。',
      '我趴在你能看见的地方。你路过时顺手摸一下，一天就这么开始了。',
      '你今天起得比平时早。我假装刚醒，其实一直在等这个动静。',
      '空气里有一种新的味道。我说不清是什么，就先记下来。',
      '太阳爬到你枕头上的时候，我决定今天对你温柔一点。',
      '我听见脚步从楼道那头过来，就提前站到门后了。',
      '今天没什么特别的开始。就是普通的、有你的一个早上。',
      '我在窗边坐了一会儿，看外面的世界忙来忙去，跟我没关系。',
      '你走之前说了句什么。我没听懂，但我点头了。',
      '天气转凉了。你把我抱起来的时候，手比我的肚子还凉。',
      '今天早上什么都没发生。这在我这里，算一件好事。'
    ],
    openCat: [
      '我在纸箱里睡到下午。纸箱比窝好，因为那是你拆快递剩下的。',
      '窗台上有一只鸟，我们互相看了一上午，谁也没赢。',
      '凌晨我跑了两趟客厅。地板很滑，我拐弯的时候很帅。'
    ],
    openDog: [
      '你一睁眼，我的尾巴就开始上班了。',
      '我今天闻了一路。什么都要闻，昨天闻过的也要再闻一次。'
    ],

    beat: {
      meal: [
        '饭盆放下的声音，我这辈子都不会听错。',
        '我吃得很慢，因为吃完就没了；但也没慢到你会收走。',
        '今天的饭很好吃。一粒都没剩，这是我表达感谢的方式。',
        '我假装不饿，等你走开两步，才把头低下去。',
        '你蹲在旁边看我吃。我已经习惯被看着吃饭了，人类真奇怪。',
        '吃完我还舔了三遍碗，万一还有呢。',
        '我留了最好的一口，想给你。后来忘了，就自己吃了。',
        '你称了 {n} 克。我数不清克，我只知道不够。'
      ],
      mealMulti: [
        '今天吃了好几顿。我不能说我不满意。',
        '饭盆空了一次又一次。今天是个好日子。'
      ],
      water: [
        '我喝了很久的水。你听见了，抬头看我一眼，我就喝得更响。',
        '水碗里飘着一根我的毛，我照喝不误。',
        '今天的口渴来得很突然，我把整张脸都埋了进去。',
        '我喝水的时候你不在。不然我会多喝两口给你看。'
      ],
      poop: [
        '今天的便便很标准。我把它埋好，有一点点骄傲。',
        '你每次都会看一眼再冲掉。我觉得这是一种关心。',
        '我在地板上转了三圈才找到感觉。你假装没看见。',
        '结束后我跳上沙发，坐得很端正。'
      ],
      poopOpt: {
        '正常': ['很好，很标准。今天身体是听话的。', '形状完美。我埋的时候特别认真。'],
        '偏软': ['今天不太成形。我有点不好意思，但你只是看了一眼，没说什么。', '软了一点。你的眉毛动了一下，我看在眼里。'],
        '偏硬': ['今天有点费劲。我背对着你，不太想被看见。', '干了点。我喝的水大概还不够。'],
        '拉稀': ['今天不太对劲。你皱着眉拿纸，我在旁边装作很无辜。', '不太妙。我今天可能吃错了什么。']
      },
      pee: [
        '我尿在了该尿的地方。这个家的规矩，我其实都懂。',
        '尿完我很满意，还用爪子假装处理了一下。',
        '你正好路过。我们交换了一个「都懂」的眼神。'
      ],
      vomit: [
        '我吐在了地板上。吐完先抬头看你一眼，怕你生气。',
        '又吐了。你擦地板的时候手很快，我站在旁边，尾巴贴着腿。',
        '胃里翻了一下，我没忍住。你蹲下来摸我的背，说没关系。',
        '我吐完自己走开了两步，觉得丢脸。',
        '那团东西我看着眼熟。今天的饭，白吃了。'
      ],
      med: [
        '药是苦的。你的手是甜的，所以我还是咽下去了。',
        '你把药藏在罐头里。我早就发现了，但我配合你。',
        '吃完药你奖励了我一下。这笔交易我接受。',
        '我吐了一半出来，你又塞回去。我们都不容易。'
      ],
      vet: [
        '白衣服的人摸我的肚子，我忍住了，因为你一直在旁边。',
        '医院的味道我认得。我把头埋进你的胳膊里，这样没那么怕。',
        '针扎进来时我叫了一声。不是为了疼，是为了让你心疼。',
        '一路上你都在跟我说话，语速比平时快。我听不懂，但我知道要乖。',
        '回家的车上我睡着了。醒来已经在楼下，我认得那个味道。'
      ],
      weight: [
        '你把我放上那块冷冰冰的板子。我坐得笔直，像在领奖。',
        '{n} 公斤。你笑了。我不知道那是什么意思，但应该不是坏事。',
        '我在板子上待了不到五秒，你念叨了一整天。',
        '数字跳了两下才停。你拿手机拍了照，我就知道这事很重要。',
        '比上次重了一点。你没说什么，但摸我的时候手更轻了。'
      ],
      walk: [
        '外面的世界很大，我还是更习惯你走的方向。',
        '我走两步就回头看你一眼，确认你还在后面。'
      ],
      walkCat: [
        '你把我放进包里，我露出一个头。街上的人都在看我，我装作不在意。',
        '出门三分钟我就想回家了。但你在，我就再坚持一会儿。',
        '我蹲在草里不动。你以为我害怕，其实我在观察一只虫子。',
        '路过的每一辆车我都记住了。下次它们再来，我就知道。'
      ],
      walkDog: [
        '绳子一响，我的四条腿比脑子先动。',
        '我闻了七棵树、三个消防栓，还有一个我认识的朋友。',
        '今天跑得很快，风把耳朵吹到后面去了。我很帅，我知道。',
        '路上遇到一只同类。我们对视两秒，交换了全部信息。',
        '一到楼下我就开始拉你。你被拽得踉跄，还在笑。'
      ],
      play: [
        '你扔出去，我追回来。这个游戏你好像永远玩不腻。',
        '我把玩具藏在沙发底下，然后假装找不到，等你帮我。',
        '我们追着跑了两圈。你喘得比我厉害。',
        '我扑住了那只红色的东西。它没有生命，但今天它是我的猎物。',
        '你躲在门后吓我，我配合地跳了一下。',
        '玩到一半我突然不想玩了。你举着玩具愣在那里，很好笑。'
      ],
      bath: [
        '水。又是水。我假装很生气，其实水温刚好。',
        '我抖了一百下，把水全甩到你身上。这是我今天最成功的事。',
        '洗完我闻起来像你喜欢的味道。我照了照镜子，勉强满意。',
        '泡沫进了一点到鼻子里，我打了个很大的喷嚏。你笑得很开心。',
        '擦干的时候我很乖。因为我知道，接下来会有奖励。'
      ],
      sleep: [
        '我睡了很久。梦里有你，还有一只我追不到的鸟。',
        '我选了你椅子底下那块地板睡。这样你一动我就能醒。',
        '你也在睡。我们呼吸的节奏慢慢对上了。',
        '睡着之前我翻了个身，把肚皮朝着你。这是我能给的最大信任。',
        '我睡在阳光走过的那块地板上。它走了，我就换个地方继续。'
      ],
      cuddle: [
        '我蹭了你的手。你也蹭回来。我们扯平了。',
        '我把整个重量都靠在你身上。你动了动，但没推开我。',
        '你摸我的下巴，我发出了不该发出的声音。',
        '我把头搁在你腿上。你打字的声音从骨头里传上来。',
        '你叫我名字的时候，我假装没听见，但尾巴出卖了我。'
      ],
      naughty: [
        '我打碎了一个杯子。你骂我的时候，我一直在看你的睫毛。',
        '我把桌上的东西推下去了。推的时候，你在看手机。',
        '我抓了沙发。那个声音太爽了，我控制不住。',
        '我咬你的手指，没用力。你笑了，我就咬得更轻。',
        '我翻垃圾桶被你抓到。我站在原地，装作只是路过。'
      ],
      vaccine: [
        '今天被按在台子上，扎了一下。我没闹，因为你说「乖」。',
        '针进去的时候，我在数你的呼吸。三下。都挺稳的。',
        '胳膊有点酸。我今天什么都不想干，这也是有理由的。',
        '那个人夸我勇敢。其实我只是没跑掉。',
        '回家的路上你一直摸我的头。我就当这是奖励了。',
        '我知道你带我出门，有一半是为了这个。我原谅你了。'
      ],
      deworm: [
        '后颈被挤了一管凉凉的东西。味道我不喜欢，但我没舔。',
        '你翻我脖子的动作很熟练，我配合得像排练过。',
        '药水凉了一下就没了。剩下的半天，我都在闻自己。',
        '这件事你比我记得清楚。你数着日子呢。'
      ],
      surgery: [
        '醒来的时候你在旁边。我第一件事是找你。',
        '今天睡了一觉，醒来身上有点不对。你说没事，我就信了。',
        '肚子上有点疼。我尽量不表现得像个病号，但走得慢了。',
        '你没让我舔那个地方。我试了两次，都被你拦住了。',
        '今天我没什么力气。你把我抱到床上，我就没再动。'
      ],
      status: [
        '我今天什么样子，你一眼就看出来了。你比体温计准。',
        '你摸了很久我的鼻子。大概是凉的，你就放心了。',
        '你今天看我的次数比平时多。我什么都没说，但我都看见了。'
      ],
      statusOpt: {
        '很好': [
          '今天我状态很好。跳上柜子一次就成了，落地也很稳。',
          '今天浑身是劲。我绕着屋子跑了两圈，纯属开心。',
          '今天我什么都想试试。连你藏起来的那个袋子我也够到了。'
        ],
        '正常': [
          '和平时一样。没什么可说的——这挺好的。',
          '今天很正常。吃饭、睡觉、看你，都在正常范围内。',
          '一切照旧。这种没有意外的日子，其实很贵。'
        ],
        '有点蔫': [
          '今天我没什么力气。趴着，看着，等你过来。',
          '我不想动。不是不开心，就是今天想省着点用。',
          '我在角落里待着。你来找我，我尾巴动了一下。'
        ],
        '不舒服': [
          '今天我不太舒服。你摸我的时候，我往你手里靠了靠。',
          '我躲到了床底下。你不喊我，只是把水和饭放在门口。',
          '我不太想被碰，但你在旁边坐着，我就没那么难受。'
        ]
      }
    },

    photo: [
      '你举起那个会闪光的小方块对着我。我配合地看了一眼，你就笑了。',
      '你拍了我。我假装没看见，其实偷偷把下巴抬高了一点。',
      '那个小方块又闪了一下。我想，它比我更常被你看着。',
      '你对着我拍了很久。我猜，你是想把今天留下来。',
      '我被拍的时候有点紧张。但你在笑，那就算了。',
      '你蹲下来，把那个小方块凑得很近。我第一次发现，你蹲下来和我一样高。',
      '今天我出现在那个小方块里了。不知道它会不会替我记住。'
    ],

    videoShot: [
      '你举着那个小方块，对着我拍了好一会儿。我假装不知道，其实每一步都走得很稳。',
      '镜头一直跟着我。我走到哪儿，它就转到哪儿——像你一样。',
      '你拍了会动的那种。我看了一眼回放，原来我跑起来是这个样子。'
    ],

    observe: [
      '人类真奇怪。明明有那么多事要做，却愿意花十分钟看我吃饭。',
      '你总说「马上」。我不认识「马上」，我只认识门开的声音。',
      '我数过你一天叫我名字的次数。比你以为的多，也比你以为的少。',
      '你难过的时候不说话。我不问，我只是挨着你坐下。',
      '你们把时间分成一格一格，我把它分成「你在」和「你不在」。',
      '我不知道「永远」有多长。但如果你在，我可以先不着急。',
      '你出门前会回头看一眼。那一眼我收下了。',
      '你身上的味道每天都不太一样，只有一种不变——那是「家」。',
      '你说的话我大部分听不懂。但我听得懂你的语气，尤其是叫我的时候。',
      '我记不住日期。我记住的是「洗澡那天」「打针那天」「你哭的那天」。',
      '你把我的照片存在一个小小的方块里。我也把你，存在一个小小的方块里。',
      '人类喜欢问「你爱不爱我」。我不回答，我只是走过去。',
      '我这一生去过的地方不多。你是最好玩的那一个。',
      '你睡着的时候最好看。我看过很多次，每次都这样觉得。',
      '世界很大，我知道。可我的世界，从这扇门到那扇窗，已经很够了。',
      '你们总是在算日子。我只算你回来过几次。',
      '你今天叹了几次气，我都数着呢。有一声特别长。',
      '你把好吃的都分我一半，把难过的都留给自己。这不公平。',
      '我听得懂「乖」，也听得懂「不许」。但这两个词你从来不会说得很凶。',
      '有时候我只是想确认你会不会回头。你回头了，我就跑过来。'
    ],

    close: [
      '明天见。如果你还记得的话。',
      '我已经想好明天要在哪里等你了。',
      '晚安。我把爪子搭在你手边，这样你翻身的时候就不会找不到我。',
      '今天就这样吧。剩下的时间，我用来喜欢你。',
      '明天，罐头，还是你。随便哪个先来都行。',
      '我把今天收好了，存在只有我知道的地方。',
      '明天也要在。这句我写在心里，不用你答应。',
      '灯关了。我在黑暗里睁着眼，等你睡着了我才睡。',
      '今天到此为止。我的尾巴还翘着。',
      '你说明天会下雨。那明天就待在你旁边。',
      '我不想写完了。写完，这一天就真的过去了。',
      '就这样。我趴下了。',
      '明天我打算对你更好一点。今天就先这样。',
      '我把一天折好，放在你脚边。'
    ],

    person: {
      tsundere: [
        '我才没有一直守在门口等你。我只是刚好在那里。',
        '你摸我的时候我没躲，但也没有很享受。你别多想。',
        '我叫你，是因为我饿了。跟你本人没有关系。',
        '这个位置不是给你留的。你坐吧，我勉强让一半。',
        '你回来的时候我背对着你。但我的耳朵是朝着门的。'
      ],
      clingy: [
        '你去哪个房间，我就跟到哪个房间。这不叫粘人，这叫顺路。',
        '你坐下我就上去，你站起来我就在你脚边。',
        '你出门以后，我把你的拖鞋推到了窝里。',
        '我在你门口趴了一下午。地板有点凉，但那是离你最近的地方。',
        '你今天在外面待得太久了。我是数着时间过的。'
      ],
      aloof: [
        '我今天看了你很久，一句话都没说。这就是我的表达方式。',
        '我不需要你。但我允许你在我附近坐着。',
        '你叫我，我抬了一下眼皮。这已经是很大的回应了。',
        '我选了一个能看见你、但你不太容易摸到我的位置。',
        '你的手伸过来，我挪了两厘米。然后就算了。'
      ],
      greedy: [
        '我一天里最重要的事，是等开饭的声音。',
        '你手里有东西的时候，你是我最爱的人。',
        '我在厨房门口坐着。我知道你今天会开那个柜子。',
        '我算过，你一天要开四次冰箱。其中两次跟我有关。',
        '我把鼻子凑到你的碗边。你分了我一口。这很合理。'
      ],
      curious: [
        '这个家里所有的柜子，我都需要再检查一遍。',
        '你新拿回来的袋子，我闻了二十分钟。',
        '有只虫子在墙上。我盯了它一个小时，它赢了。',
        '你手机里的声音是从哪里来的？我找过，找不到。',
        '门开了一条缝。我决定先不进，先看看。'
      ]
    },

    title: {
      calm: ['今天也很好', '没什么事，你也在', '普通得刚刚好', '阳光、地板、你', '一个安静的今天', '什么也没有发生'],
      happy: ['尾巴先替我回答了', '今天有好事发生', '风是甜的', '跑起来的那一天', '我笑了一整天'],
      love: ['我不想离你太远', '就待在这里', '你身上有太阳的味道', '跟着你走', '今天的距离是零'],
      proud: ['我才没有很想你', '今天也是我赢', '看在你份上', '勉强同意', '我做得很好'],
      sick: ['今天有点难', '我没什么精神', '撑一撑就过去了', '你摸着我就好', '不太好的一天'],
      sleepy: ['我睡了很久', '什么都不想做', '一块被晒暖的石头', '今天暂停营业', '梦见了你'],
      excited: ['快一点，再快一点', '我今天特别行', '出门！', '世界很吵，很好', '忍不住了']
    },

    /* 大事那天的开场：先把气氛定在正事上，而不是随手写天气 */
    openBig: {
      vaccine: [
        '今天出门的方向不对。不是公园那边。',
        '一路上你没怎么说话，我就知道今天不是去玩。',
        '门口的牌子我认识。上一次来，我在这里叫了很久。',
        '今天没走那条有草的路。'
      ],
      vet: [
        '车停在一个我认识的地方。我不太想下车。',
        '今天身上有点不对劲。你比我先发现。',
        '我闻到了消毒水的味道，往你腿后面退了半步。',
        '这一路上我一直贴着你，你也一直没把我放下。'
      ],
      bath: [
        '水声一响，我就知道躲不掉了。',
        '你卷起袖子的样子，我一看就明白。',
        '今天的地板是湿的，我也是。'
      ],
      surgery: [
        '今天没有早饭。我知道要发生点什么。',
        '空气里有药味，跟平时不一样。',
        '你抱我的时候比平常紧一点。'
      ],
      deworm: [
        '你翻我后颈的动作，我认得。',
        '又到了这个日子。',
        '那个小瓶子一拿出来，我就开始躲。'
      ]
    },

    /* 大事那天的标题 */
    titleBig: {
      vaccine: ['今天挨了一下', '打针的那天', '我忍住了', '一下就好', '今天有正事'],
      vet: ['去看医生', '今天去了医院', '我没事，你别皱眉', '白大褂的人', '不太舒服的一天'],
      bath: ['洗澡日', '水声之后', '湿透了的一天', '我不喜欢水', '洗完还是香的'],
      surgery: ['手术那天', '醒来第一眼是你', '睡了一觉', '今天很长', '有点疼，但你在'],
      deworm: ['又到这一天', '后颈一凉', '小瓶子的日子', '例行的事'],
      status: ['今天状态很好', '一切都在位上', '满格的一天', '状态：好']
    },

    bridge: {
      morning: ['早上先说。', '天刚亮的时候就这些。', '早上，一切照旧。'],
      day: ['白天就这样过去了。', '到了白天。', '后来。'],
      evening: ['天黑了以后。', '晚上。', '入夜了。'],
      solo: ['一天就这么几件事，我按顺序说。', '不多，就这些。', '事情不多，但都记住了。']
    },
    focusOpen: [
      '你说{n}。就这一句，够我想一整天了。',
      '{n}——这件事我本来不打算承认的。',
      '只发生了一件事：{n}。别的都不算数。',
      '{n}。你写下来的时候，我就在旁边看着。',
      '{n}。我没觉得自己做错了什么。',
      '你记的是：{n}。我记的是你写它时候的表情。'
    ],
    focusRiff: [
      '「{k}」这件事，我有我的道理。',
      '你看见「{k}」的时候笑了一下。那我就当没事了。',
      '关于「{k}」，我没什么要解释的。',
      '「{k}」本来就在那儿，我只是刚好经过。',
      '你后来一直提「{k}」。我就当你在夸我。',
      '我现在还记得「{k}」当时是什么样子。'
    ],
    focusShot: [
      '你举着那个小方块对着我。我假装没看见。',
      '拍的是「{k}」——那我不躲了。',
      '那个小方块一直跟着我，我只好把「{k}」又演了一遍。'
    ],
    focusClose: [
      '这件事就到这儿。剩下的明天再说。',
      '反正你记住了。我也记住了。',
      '别的都可以忘，「{k}」不行。',
      '我把今天折好，放在「{k}」旁边。'
    ],
    focusTitle: ['关于「{k}」', '今天的主角是「{k}」', '「{k}」这件事', '我记住的是「{k}」', '{k}'],
    noteTpl: [      '你写下：「{n}」。我不识字，但我猜那里面有我。',
      '你在手机上记了一笔：「{n}」。字很小，可我知道你在说我。',
      '你说了一句「{n}」，语气很轻。我记下了。'
    ],

    /* 自定义性格：先引用你写的，再决定要不要补一句 */
    personQuote: [
      '你写我是个「{x}」的家伙。我承认一半。',
      '你说我「{x}」。你比我自己还清楚我。',
      '「{x}」——这话是你写的，我记下了。',
      '你在本子上形容我：「{x}」。我今天就按这个演。'
    ],
    personCustom: [
      '你懂我，所以我不必解释。',
      '我做我自己。你也在旁边做你自己。挺好。',
      '我不知道这算不算性格。我只知道今天我想这样过。'
    ],

    /* 自定义事件：{x} 是你给它起的名字。
       写成"我正在经历的事"，不写成"你记了一笔所以我认了"。 */
    custom: [
      '你把我按在腿上做「{x}」。我假装要跑，其实一动没动。',
      '「{x}」，前后不到五分钟。这五分钟里我看了你八次。',
      '做「{x}」的时候你一直跟我说话。我一句没听懂，但声音是好的。',
      '「{x}」完事，你给了我一块冻干。所以我决定记得香一点。',
      '今天做了「{x}」。我不喜欢，但我忍住了，因为你在旁边。',
      '「{x}」的时候我盯着你的手。你的手指头有点抖，比我还紧张。'
    ],
  };

  /* ---------------- 随机与去重 ---------------- */

  function hash(s) {
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return (h >>> 0).toString(36);
  }
  function seedOf(s) {
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function clean(pool) {
    return (pool || []).filter(function (s) { return typeof s === 'string' && s.length; });
  }

  /* 从池中选一句：优先没被用过的；{n} 需要 ctx.num 才可选 */
  function pick(rng, pool, used, ctx) {
    pool = clean(pool);
    if (ctx && !ctx.num) pool = pool.filter(function (s) { return s.indexOf('{n}') < 0; });
    if (!pool.length) return '';
    var fresh = pool.filter(function (s) { return !used[hash(s)]; });
    var arr = fresh.length ? fresh : pool;
    var line = arr[Math.floor(rng() * arr.length)];
    used[hash(line)] = 1;
    return line;
  }

  /* ---------------- 心情 ---------------- */

  function has(events, t) {
    return events.some(function (e) { return e.type === t; });
  }

  function computeMood(events) {
    var worse = events.some(function (e) {
      return e.type === 'status' && (e.opt === '不舒服' || e.opt === '有点蔫');
    });
    if (worse || has(events, 'vomit') || has(events, 'vet') || has(events, 'surgery')) return 'sick';
    if (has(events, 'naughty')) return 'proud';
    if (has(events, 'walk') || has(events, 'play')) return 'excited';
    if (has(events, 'cuddle') || has(events, 'med')) return 'love';
    if (events.some(function (e) { return e.type === 'status' && e.opt === '很好'; })) return 'happy';
    if (has(events, 'sleep') && events.length === 1) return 'sleepy';
    if (has(events, 'meal') || has(events, 'water') || has(events, 'poop')) return 'calm';
    if (has(events, 'bath') || has(events, 'weight')) return 'sleepy';
    return 'calm';
  }

  /* 事件显示名：内置的用 PT.TYPE，自定义的用你自己起的名字 */
  function labelOf(e) {
    if (!e) return '';
    var t = PT.TYPE[e.type];
    return t ? t.label : (e.label || e.type || '');
  }

  /* ---------------- 段落组织 ---------------- */

  var PROMINENT = { vomit: 0, vet: 1, vaccine: 1.5, deworm: 2.5, med: 2, bath: 3, naughty: 4, status: 6 };

  function pickBeats(events) {
    var seen = {};
    var list = [];
    events.slice().sort(function (a, b) {
      return (a.at || 0) - (b.at || 0);
    }).forEach(function (e) {
      if (!e || !e.type || seen[e.type]) {
        if (e && e.type && seen[e.type]) seen[e.type].count++;
        return;
      }
      var b = { type: e.type, num: e.num, opt: e.opt, count: 1, at: e.at, label: e.label };
      seen[e.type] = b;
      list.push(b);
    });
    var MAX = 5;
    if (list.length <= MAX) return list;
    // 太长的日子：保留最早的 2 条 + 最重要的几条
    var keep = list.slice(0, 2);
    var rest = list.slice(2).sort(function (a, b) {
      var pa = PROMINENT[a.type] == null ? 9 : PROMINENT[a.type];
      var pb = PROMINENT[b.type] == null ? 9 : PROMINENT[b.type];
      return pa - pb;
    });
    keep = keep.concat(rest).slice(0, MAX);
    keep.sort(function (a, b) { return (a.at || 0) - (b.at || 0); });
    return keep;
  }

  function fmtNum(n) {
    if (n == null || n === '') return '';
    var v = Number(n);
    if (!isFinite(v)) return String(n);
    return (Math.round(v * 10) / 10).toString();
  }

  function beatLines(b, pet) {
    var species = pet.species === 'dog' ? 'dog' : 'cat';
    var B = LEX.beat;
    var lines = [];
    switch (b.type) {
      case 'meal':
        lines = b.count >= 2 ? B.mealMulti.concat(B.meal) : B.meal;
        break;
      case 'poop':
        if (b.opt && B.poopOpt[b.opt]) lines = B.poopOpt[b.opt].concat(B.poop);
        else lines = B.poop;
        break;
      case 'walk':
        lines = B.walk.concat(species === 'dog' ? B.walkDog : B.walkCat);
        break;
      case 'status':
        lines = B.statusOpt[b.opt] || B.status;
        break;
      default:
        lines = B[b.type] || (PT.TYPE[b.type] ? [] : LEX.custom);
    }
    return lines;
  }

  /* 从「你写的那句话」里挑一个像样的词，用来当标题和线索 */
  var NOTE_STOP = ['我', '你', '它', '他', '她', '们', '的', '了', '着', '过', '得', '地', '是', '在', '和', '跟', '把', '被', '给', '就', '都', '也', '又', '还', '很', '太', '不', '没', '有', '这', '那', '个', '只', '次', '今天', '然后', '后来', '一下', '一个', '一根', '一只', '一块', '说', '看', '去', '来', '上', '下', '里', '吗', '呢', '啊', '吧', '呀', '哦', '嗯'];

  function noteTopic(note) {
    var s = String(note || '')
      .replace(/[「」“”"'’]/g, ' ')
      .replace(/[，。！？、,.!?;；:：…—~～]/g, ' ');
    var best = '';
    s.split(/\s+/).forEach(function (part) {
      var t = part;
      NOTE_STOP.forEach(function (w) { t = t.split(w).join(' '); });
      t.split(/\s+/).forEach(function (w) {
        if (w.length >= 2 && w.length > best.length) best = w;
      });
    });
    return best;
  }

  /* ---------------- 主函数 ---------------- */

  function generate(opt) {
    opt = opt || {};
    var pet = opt.pet || {};
    var date = opt.date || PT.todayKey();
    var events = (opt.events || []).filter(function (e) { return e && e.type; });
    var note = (opt.note || '').trim();
    var reroll = opt.reroll || 0;
    var history = opt.history || [];

    var rng = mulberry32(seedOf(
      date + '|' + (pet.name || '') + '|' + (pet.personality || '') + '|' + (pet.personalityText || '') + '|' + reroll + '|' + events.length + '|' + (opt.media || []).length
    ));
    var used = {};
    history.forEach(function (h) { used[h] = 1; });

    var mood = computeMood(events);
    var beats = pickBeats(events);
    var species = pet.species === 'dog' ? 'dog' : 'cat';
    var paras = [];

    /* 今天最"重"的那件事：开场和标题要先照顾它 */
    var lead = beats.slice().sort(function (a, b) {
      var pa = PROMINENT[a.type] == null ? 9 : PROMINENT[a.type];
      var pb = PROMINENT[b.type] == null ? 9 : PROMINENT[b.type];
      return pa - pb;
    })[0];

    var media = opt.media || [];
    var hasPhoto = false, hasVideo = false;
    media.forEach(function (m) {
      if (m && m.kind === 'photo') hasPhoto = true;
      if (m && m.kind === 'video') hasVideo = true;
    });

    /* 有「你写的那句话」时，整篇围着它写，不再走模板 */
    var topic = note ? noteTopic(note) : '';
    if (note) {
      var plain = note.replace(/[「」]/g, '');
      var filled = function (list) {
        var t = pick(rng, list, used);
        if (!t) return '';
        return t.replace(/\{n\}/g, plain).replace(/\{k\}/g, topic || plain);
      };
      paras.push(filled(LEX.focusOpen));
      paras.push(filled(LEX.focusRiff));
      if (hasPhoto || hasVideo) {
        var shot = topic ? pick(rng, LEX.focusShot, used) : '';
        if (shot) paras.push(shot.replace(/\{k\}/g, topic));
      }
      if (beats.length) {
        var bl = pick(rng, beatLines(beats[0], pet), used, { num: beats[0].num != null && beats[0].num !== '' });
        if (bl) {
          if (bl.indexOf('{n}') >= 0) bl = bl.replace(/\{n\}/g, fmtNum(beats[0].num));
          if (bl.indexOf('{x}') >= 0) bl = bl.replace(/\{x\}/g, (beats[0].label || labelOf(beats[0])).replace(/[「」]/g, ''));
          paras.push(bl);
        }
      }
      /* 性格那一句照旧，气口要一致 */
      var ptxtF = (pet.personalityText || '').trim();
      if (pet.personality === 'custom' || (!LEX.person[pet.personality] && !!ptxtF)) {
        if (ptxtF && rng() < 0.75) paras.push(pick(rng, LEX.personQuote, used).replace(/\{x\}/g, ptxtF.replace(/[「」]/g, '')));
      } else {
        paras.push(pick(rng, LEX.person[pet.personality] || LEX.person.aloof, used));
      }
      var cl = pick(rng, LEX.focusClose, used, {});
      paras.push(cl ? cl.replace(/\{k\}/g, topic || plain) : pick(rng, LEX.close, used));
    }

    if (!note) {
      var big = lead && LEX.openBig[lead.type] ? pick(rng, LEX.openBig[lead.type], used, {}) : '';
      if (big) {
        paras.push(big);
      } else if (!beats.length) {
        paras.push(pick(rng, LEX.open.concat(species === 'dog' ? LEX.openDog : LEX.openCat), used));
      }
    }

    var bridgeDone = {};
    var slot = function (b) {
      if (!b.at) return 'solo';
      var h = new Date(b.at).getHours();
      return h < 12 ? 'morning' : (h < 18 ? 'day' : 'evening');
    };
    /* 只有跨时段才需要「早上/白天/晚上」这种过场，同一天同一时段的几条不用 */
    var slotSet = {};
    beats.forEach(function (b) { slotSet[slot(b)] = 1; });
    var multiAct = Object.keys(slotSet).length > 1;
    if (!note) beats.forEach(function (b, bi) {
      if (multiAct) {
        var k = slot(b);
        if (!bridgeDone[k]) {
          bridgeDone[k] = 1;
          paras.push(pick(rng, LEX.bridge[k] || LEX.bridge.solo, used, {}));
        }
      }
      var line = pick(rng, beatLines(b, pet), used, { num: b.num != null && b.num !== '' });
      if (!line) return;
      if (line.indexOf('{n}') >= 0) line = line.replace(/\{n\}/g, fmtNum(b.num));
      if (line.indexOf('{x}') >= 0) line = line.replace(/\{x\}/g, (b.label || labelOf(b)).replace(/[「」]/g, ''));
      paras.push(line);
    });

    if (!note) {
      var ptxt = (pet.personalityText || '').trim();
      var isCustom = pet.personality === 'custom' || (!LEX.person[pet.personality] && !!ptxt);
      if (hasPhoto || hasVideo) {
        paras.push(pick(rng, LEX.photo.concat(hasVideo ? LEX.videoShot : []), used));
      }
      if (isCustom) {
        if (ptxt && rng() < 0.8) {
          paras.push(pick(rng, LEX.personQuote, used).replace(/\{x\}/g, ptxt.replace(/[「」]/g, '')));
        } else if (rng() < 0.4) {
          paras.push(pick(rng, LEX.personCustom, used));
        }
      } else if (rng() < (beats.length > 3 ? 0.3 : 0.62)) {
        paras.push(pick(rng, LEX.person[pet.personality] || LEX.person.aloof, used));
      }
      if (beats.length < 4) paras.push(pick(rng, LEX.observe, used));
      paras.push(pick(rng, LEX.close, used));
    }

    var titles = LEX.title[mood] || LEX.title.calm;
    var title = '';
    if (note && topic) {
      title = pick(rng, LEX.focusTitle, used, {}).replace(/\{k\}/g, topic);
    }
    if (!title && lead && LEX.titleBig[lead.type] && !note && rng() < 0.8) {
      title = pick(rng, LEX.titleBig[lead.type], used, {});
    }
    if (!title) title = pick(rng, titles, used);

    var tags = [];
    beats.forEach(function (b) {
      var label = labelOf(b);
      if (label && tags.indexOf(label) < 0) tags.push(label);
    });

    return {
      title: title,
      body: paras.filter(Boolean).join('\n'),
      mood: mood,
      tags: tags.slice(0, 3),
      used: Object.keys(used),
      seed: reroll
    };
  }

  /* 首屏的一句话（按日期稳定，不随刷新乱跳） */
  var FLAVOR = [
    '我在这儿。',
    '今天也要记我吗？',
    '你先忙，我看着你。',
    '我把今天留了一个位置给你。',
    '有点无聊，但还好有你。',
    '我刚睡醒。你呢？',
    '今天可以摸我三次。',
    '我在想一件很重要的事。想不起来了。'
  ];
  function flavor(pet, dateKey) {
    var i = seedOf((pet && pet.name ? pet.name : '') + '|' + (dateKey || PT.todayKey())) % FLAVOR.length;
    return FLAVOR[i];
  }

  function greeting() {
    var h = new Date().getHours();
    if (h < 5) return '这么晚还没睡。';
    if (h < 11) return '早上好。';
    if (h < 14) return '中午了，吃饭了吗。';
    if (h < 18) return '下午的光很好。';
    if (h < 23) return '天黑了。';
    return '该睡了。';
  }

  PT.WRITER = {
    generate: generate,
    flavor: flavor,
    greeting: greeting,
    computeMood: computeMood,
    _lex: LEX
  };
})();
