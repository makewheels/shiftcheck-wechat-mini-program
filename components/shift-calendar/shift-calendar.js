Component({
  properties: {
    //由 utils/calendar.js 的 buildMonth() 生成
    cal: {
      type: Object,
      value: null
    }
  },

  methods: {
    onDayTap: function(e) {
      var day = e.currentTarget.dataset.day
      if (!day) {
        return
      }
      this.triggerEvent('daytap', {
        year: this.data.cal.year,
        month: this.data.cal.month,
        day: day
      })
    }
  }
})
