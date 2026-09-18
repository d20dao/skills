import { builtins, mapRandomness, hashMapping } from '@d20dao/vrf-sdk';

// Mapping specs, not epoch source recipes: these say how one accepted word becomes application values.
export const mappings = {
  raw: builtins.raw(),
  d20: builtins.d20(),
  fourDice: builtins.diceRoll(6n, 4),
  coin: builtins.coinFlip(),
  range: builtins.numberRange(10n, 100n),
  chooseOne: builtins.chooseOne(52),
  chooseThree: builtins.chooseMany(52, 3),
  shuffle: builtins.shuffle(52),
};

// Supply the accepted word only after validating its request/proof/chain context.
// Mapping a word by itself is not proof verification.
export function deriveMappedResult(acceptedWord, spec) {
  return { values: mapRandomness(acceptedWord, spec), mappingHash: hashMapping(spec) };
}
