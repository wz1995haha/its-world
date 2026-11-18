/* face.js — 头像组件：照片 > 品种头像图 > 拼出来的脸 */
var face = require('../../utils/face.js');
var faces = require('../../utils/faces.js');

Component({
  properties: {
    species: { type: String, value: 'cat' },
    mood: { type: String, value: 'calm' },
    breedId: { type: String, value: '' },
    size: { type: String, value: '' },
    photo: { type: String, value: '' }
  },
  data: {
    s: {},
    pic: ''
  },
  observers: {
    'species, mood, breedId': function () {
      this.refresh();
    }
  },
  lifetimes: {
    attached: function () {
      this.refresh();
    }
  },
  methods: {
    refresh: function () {
      var d = this.data;
      this.setData({
        s: face.styleOf(d.species, d.mood, d.breedId),
        pic: faces.pathOf(d.species, d.breedId, d.mood)
      });
    }
  }
});
