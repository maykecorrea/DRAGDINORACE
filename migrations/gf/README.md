# Migração do `state` da Garagem Falida

As tabelas nascem em `migrations/0006_gf.sql`. Esta pasta **não** é aplicada pelo migrador (ele não entra em subpastas). Aqui mora a troca de formato do JSON `gf_runs.state`, feita **na leitura**.

`engine_version` e `content_version` ficam gravados na campanha (`0.2.0` e `v1` hoje). Quando o motor mudar:

1. Crie `migrations/gf/<versão-antiga>-<versão-nova>.ts` exportando `migrate(state)`.
2. Registre o passo em `src/game/gf/engine.ts` (`STATE_STEPS`), na ordem.
3. `getActive` e `applyAction` chamam `migrateState`. Se a versão mudou, gravam o JSON novo e a `engine_version` nova na mesma leitura.

Uma campanha antiga continua abrindo. O cliente nunca manda o estado, só a ação.
