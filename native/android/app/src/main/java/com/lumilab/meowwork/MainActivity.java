package com.lumilab.meowwork;


import com.lumilab.meowwork.MeowStoreBillingPlugin;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        registerPlugin(MeowStoreBillingPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
