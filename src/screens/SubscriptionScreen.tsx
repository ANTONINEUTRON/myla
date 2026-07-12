import React from 'react';
import { View, Text, TextInput, TouchableOpacity, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthStep } from '../services/txoddsAuth';

interface SubscriptionScreenProps {
  step: AuthStep;
  error: string | null;
  onManualConfigure: (jwt: string, apiToken: string) => void;
}

const STEP_META: Record<AuthStep, { icon: string; label: string }> = {
  idle: { icon: 'hourglass-outline', label: 'Preparing...' },
  getting_jwt: { icon: 'key-outline', label: 'Getting API access...' },
  subscribing: { icon: 'newspaper-outline', label: 'Subscribing to free World Cup data...' },
  error: { icon: 'terminal-outline', label: 'Setup Required' },
};

export default function SubscriptionScreen({
  step,
  error,
  onManualConfigure,
}: SubscriptionScreenProps) {
  const isManualSetup = step === 'error';

  return (
    <SafeAreaView className="flex-1 bg-background justify-center items-center px-8">
      <View className="items-center">
        {/* Icon */}
        <View className="mb-8">
          {step === 'getting_jwt' ? (
            <View className="w-20 h-20 rounded-full bg-primary-glow items-center justify-center">
              <Ionicons name="hourglass-outline" size={36} color="#FF6B35" />
            </View>
          ) : (
            <View className="w-20 h-20 rounded-full bg-primary-glow items-center justify-center">
              <Ionicons name="terminal-outline" size={36} color="#FF6B35" />
            </View>
          )}
        </View>

        {/* Title */}
        <Text className="text-2xl font-bold text-text-primary text-center mb-2">
          {step === 'getting_jwt' ? 'Connecting...' : 'One-Time Setup Required'}
        </Text>

        {/* Description */}
        {step === 'getting_jwt' && (
          <Text className="text-base text-text-secondary text-center leading-6">
            Getting API access...
          </Text>
        )}

        {isManualSetup && (
          <View className="w-full mt-4">
            <Text className="text-base text-text-secondary text-center leading-6 mb-4">
              Run this command in your terminal to activate the free World Cup tier:
            </Text>
            <View className="bg-surface rounded-xl p-4 border border-border">
              <Text className="text-primary font-mono text-sm leading-6">
                node scripts/activate-txodds.mjs
              </Text>
            </View>
            <Text className="text-xs text-text-muted text-center mt-3 leading-5">
              This subscribes on-chain via Solana mainnet and saves your API token.
              No payment required. After running it, restart the app.
            </Text>
          </View>
        )}

        {error && isManualSetup && (
          <Text className="text-xs text-text-muted text-center mt-4 leading-5 px-4">
            {error}
          </Text>
        )}
      </View>

      {/* Manual config form */}
      {isManualSetup && (
        <ManualConfigForm onConfigure={onManualConfigure} />
      )}
    </SafeAreaView>
  );
}

/** Inline form to paste JWT and API token manually. */
function ManualConfigForm({
  onConfigure,
}: {
  onConfigure: (jwt: string, apiToken: string) => void;
}) {
  const [jwt, setJwt] = React.useState('');
  const [apiToken, setApiToken] = React.useState('');

  return (
    <View className="mt-8 w-full gap-4">
      <Text className="text-sm text-text-secondary text-center">
        Or paste your credentials below if you already have them:
      </Text>
      <View className="bg-surface rounded-xl px-4 py-3 border border-border">
        <Text className="text-xs text-text-muted mb-1">JWT</Text>
        <TextInput
          value={jwt}
          onChangeText={setJwt}
          placeholder="Paste JWT here..."
          placeholderTextColor="#48484A"
          className="text-text-primary text-sm"
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>
      <View className="bg-surface rounded-xl px-4 py-3 border border-border">
        <Text className="text-xs text-text-muted mb-1">API Token</Text>
        <TextInput
          value={apiToken}
          onChangeText={setApiToken}
          placeholder="Paste API token here..."
          placeholderTextColor="#48484A"
          className="text-text-primary text-sm"
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>
      <TouchableOpacity
        onPress={() => onConfigure(jwt, apiToken)}
        disabled={!jwt || !apiToken}
        className={`py-3.5 rounded-full items-center ${jwt && apiToken ? 'bg-primary' : 'bg-surface'}`}
      >
        <Text className={`font-bold text-base ${jwt && apiToken ? 'text-white' : 'text-text-muted'}`}>
          Save Credentials
        </Text>
      </TouchableOpacity>
    </View>
  );
}
