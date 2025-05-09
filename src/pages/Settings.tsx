import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/components/ui/use-toast';
import { Settings as SettingsIcon, Database, Bot, Key, Shield, Bell, RefreshCw, Save, AlertCircle } from 'lucide-react';

// Import our model training component
import ModelTrainingSettings from '@/components/ModelTrainingSettings';

const Settings = () => {
  const [activeTab, setActiveTab] = useState<string>('general');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  
  // Mock settings
  const [settings, setSettings] = useState({
    theme: 'dark',
    notifications: true,
    soundAlerts: false,
    autoBuyEnabled: false,
    autoSellEnabled: false,
    riskLevel: 'medium',
    apiKeys: {
      finnhub: 'd0etbjpr01qsrhcnqle0d0etbjpr01qsrhcnqleg',
      alphaVantage: 'demo'
    }
  });
  
  const updateSetting = (key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };
  
  const updateApiKey = (provider: string, value: string) => {
    setSettings(prev => ({
      ...prev,
      apiKeys: {
        ...prev.apiKeys,
        [provider]: value
      }
    }));
  };
  
  const saveSettings = () => {
    setIsSaving(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsSaving(false);
      
      toast({
        title: 'Settings Saved',
        description: 'Your settings have been updated successfully.',
      });
    }, 1000);
  };
  
  const handleModelTrainingComplete = () => {
    toast({
      title: 'Model Training Complete',
      description: 'Pattern detection model has been successfully trained and deployed.',
    });
  };
  
  return (
    <div className="container py-6">
      <div className="flex items-center mb-6">
        <SettingsIcon className="h-6 w-6 mr-2" />
        <h1 className="text-2xl font-bold">Settings</h1>
      </div>
      
      <Tabs defaultValue={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 mb-6">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="api">API Keys</TabsTrigger>
          <TabsTrigger value="training">Model Training</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TabsContent value="general" className="mt-0">
            <Card>
              <CardHeader>
                <CardTitle>General Settings</CardTitle>
                <CardDescription>
                  Configure the application appearance and behavior
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="theme">Application Theme</Label>
                    <Select value={settings.theme} onValueChange={(v) => updateSetting('theme', v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a theme" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="light">Light</SelectItem>
                        <SelectItem value="dark">Dark</SelectItem>
                        <SelectItem value="system">System</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="risk-level">Default Risk Level</Label>
                    <Select value={settings.riskLevel} onValueChange={(v) => updateSetting('riskLevel', v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select risk level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low Risk</SelectItem>
                        <SelectItem value="medium">Medium Risk</SelectItem>
                        <SelectItem value="high">High Risk</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="notifications">Notifications</Label>
                      <div className="text-sm text-muted-foreground">
                        Receive alerts for price movements and pattern detection
                      </div>
                    </div>
                    <Switch
                      id="notifications"
                      checked={settings.notifications}
                      onCheckedChange={(checked) => updateSetting('notifications', checked)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="sound-alerts">Sound Alerts</Label>
                      <div className="text-sm text-muted-foreground">
                        Play sound when important market events occur
                      </div>
                    </div>
                    <Switch
                      id="sound-alerts"
                      checked={settings.soundAlerts}
                      onCheckedChange={(checked) => updateSetting('soundAlerts', checked)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="api" className="mt-0">
            <Card>
              <CardHeader>
                <CardTitle>API Configuration</CardTitle>
                <CardDescription>
                  Manage API keys for data sources
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="finnhub-api">Finnhub API Key</Label>
                    <div className="flex space-x-2">
                      <Input
                        id="finnhub-api"
                        value={settings.apiKeys.finnhub}
                        onChange={(e) => updateApiKey('finnhub', e.target.value)}
                        placeholder="Enter your Finnhub API key"
                      />
                      <Button variant="outline" size="icon">
                        <Key className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Used for real-time market data and financial metrics. Get your API key at <a href="https://finnhub.io/" target="_blank" rel="noopener noreferrer" className="text-app-blue hover:underline">finnhub.io</a>
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="alphavantage-api">Alpha Vantage API Key</Label>
                    <div className="flex space-x-2">
                      <Input
                        id="alphavantage-api"
                        value={settings.apiKeys.alphaVantage}
                        onChange={(e) => updateApiKey('alphaVantage', e.target.value)}
                        placeholder="Enter your Alpha Vantage API key"
                      />
                      <Button variant="outline" size="icon">
                        <Key className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Used for historical market data and technical indicators. Get your API key at <a href="https://www.alphavantage.co/" target="_blank" rel="noopener noreferrer" className="text-app-blue hover:underline">alphavantage.co</a>
                    </p>
                  </div>
                  
                  <div className="border rounded-lg p-4 bg-yellow-500/10 border-yellow-500/20">
                    <div className="flex items-start">
                      <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5 mr-2" />
                      <div>
                        <h4 className="font-medium text-yellow-500">Real API Keys Required</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          Alpha Trend Navigator requires valid API keys to fetch real market data. The demo keys provided won't work for production use. 
                          Sign up at the respective services to get your own keys.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="pt-2">
                    <Button className="w-full" onClick={saveSettings} disabled={isSaving}>
                      {isSaving ? (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Save API Configuration
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="training" className="mt-0 col-span-1 lg:col-span-2">
            <ModelTrainingSettings onTrainComplete={handleModelTrainingComplete} />
          </TabsContent>
          
          <TabsContent value="advanced" className="mt-0">
            <Card>
              <CardHeader>
                <CardTitle>Advanced Settings</CardTitle>
                <CardDescription>
                  Configure advanced trading and AI options
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="auto-buy">Automated Buying</Label>
                      <div className="text-sm text-muted-foreground">
                        Allow AI to automatically execute buy orders
                      </div>
                    </div>
                    <Switch
                      id="auto-buy"
                      checked={settings.autoBuyEnabled}
                      onCheckedChange={(checked) => updateSetting('autoBuyEnabled', checked)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="auto-sell">Automated Selling</Label>
                      <div className="text-sm text-muted-foreground">
                        Allow AI to automatically execute sell orders
                      </div>
                    </div>
                    <Switch
                      id="auto-sell"
                      checked={settings.autoSellEnabled}
                      onCheckedChange={(checked) => updateSetting('autoSellEnabled', checked)}
                    />
                  </div>
                  
                  <Separator />
                  
                  <div className="border rounded-lg p-4 bg-yellow-500/10 border-yellow-500/20">
                    <div className="flex items-start">
                      <Shield className="h-5 w-5 text-yellow-500 mt-0.5 mr-2" />
                      <div>
                        <h4 className="font-medium text-yellow-500">Automated Trading Warning</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          Enabling automated trading allows the AI to make real transactions on your behalf. 
                          This feature should only be used by experienced traders who understand the risks involved.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="pt-2">
                    <Button className="w-full" onClick={saveSettings} disabled={isSaving}>
                      {isSaving ? (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Save Advanced Settings
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="training" className="mt-0">
            {/* Second column for model training page will be empty */}
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

export default Settings; 