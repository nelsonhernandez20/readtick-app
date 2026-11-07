package com.readtik.mobile

import android.app.Application

class ReadTikApp : Application() {
    lateinit var viewModel: AppViewModel
        private set

    override fun onCreate() {
        super.onCreate()
        viewModel = AppViewModel(this)
    }
}
