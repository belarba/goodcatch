# Descida — história de pescador no compartilhamento

## Por quê
Feedback do grupo da família: "eu nunca posto quando sou muito ruim". Hoje o post (`shareText`,
`descida/index.html`) mostra a barra (🟩🟩👢⬛⬛…), a profundidade e o "Rank D": é a vergonha
pública de quem foi mal. Com isso, o grupo só vê quem foi bem, e o jogo perde metade da
conversa.

## O que muda
- **Não pegou o peixão** (`st.end !== 'done'`): o post traz uma história de pescador e, embaixo,
  uma linha discreta de bolinhas e pontos (`●●●○○○○○○○ · 320 pts`, ● até a camada em que parou),
  sem a barra de emojis e sem rank. (Revisto em 19/nov: o dono quis sinalizar onde a pessoa
  parou; as bolinhas chamam menos atenção que os emojis.) É mentira assumida e exagerada, do tipo "quase
  peguei", e não diz nada do resultado real (nem a bota, nem o pneu).
- **Pegou o peixão**: a barra, o rank e os pontos continuam como hoje, com uma frase de vantagem
  por cima que usa o tamanho real (`st.cm`).
- O texto aparece na caixa de compartilhar do painel final e vai junto pelo `navigator.share`
  da foto, como hoje.

```
🎣 Good Catch · 18/11
Juro por tudo que fisguei um mero do tamanho de uma Kombi.
A linha estourou bem na hora de subir no barco. O vizinho viu.
goodcatch.fish
```

## Objetivos / não-objetivos / anti-objetivos
- Objetivo: quem foi mal posta. Medido pelo evento `descida/share` dividido por resultado.
- Objetivo: demorar para repetir. São quatro pedaços × 40 opções = 2.560.000 histórias. Um
  jogador não vê o mesmo pedaço duas vezes em 40 dias. Com 5 pessoas indo mal no mesmo dia, a
  chance de duas contarem o mesmo bicho é de 23% (com 15 opções seria 53%).
- Não-objetivo: botão "outra história". O sorteio é fixo por dia e jogador.
- Anti-objetivo: a história entregar quem foi mal (profundidade, objeto do enrosco, camada).
- Anti-objetivo: frase com erro de concordância numa combinação qualquer.

## Abordagens consideradas
1. **Pedaços combináveis sorteados (escolhida).** 4 bancos independentes (abertura, bicho, fuga,
   desculpa) dão ~50 mil combinações a partir de 60 frases. Exige escrever cada pedaço para
   encaixar com qualquer outro: a fuga não usa ele/ela.
2. **Lista de histórias inteiras.** Texto melhor, uma por uma, mas 100 histórias escritas à mão
   repetiriam em 3 meses de uso diário.
3. **Gerar com IA.** Quebra a regra "sem dependência de runtime" e mandaria dados para fora.
   Descartada.

## Decisões
- **Sorteio sem repetir**: para cada banco (N = 40), dia `n = num(date)` e ciclo `c = floor(n/N)`,
  embaralhar 0..N-1 com `mulberry(seedFrom(player + ':historia:' + banco + ':' + c))` e escolher
  `perm[n % N]`. Cada jogador percorre os 40 de cada banco antes de repetir. Como cada ciclo
  traz um embaralhamento novo, a história 41 não repete a história 1. Fica estável se a pessoa
  recarregar a página, e jogadores diferentes seguem filas diferentes. Sem `playerId` (storage
  bloqueado), `player = ''`. Nada vai para o servidor.
- **Inglês**: bancos `_EN` alinhados por posição, como os da Descida; o mesmo índice escolhe a
  frase equivalente.
- **Treino** (dia passado pelo diário): usa a mesma regra; o post já diz a data.
- **Minha decisão:** a foto continua igual, mostrando o objeto real e "Enroscou a 45 m". A foto
  desmentir a história é parte da graça. Se não agradar, a legenda da foto também vira história.

## Rascunho dos bancos (PT) — revisar o tom
As 15 primeiras de cada banco, aprovadas pelo dono; a implementação completa até 40 em cada
banco, no mesmo tom (os bancos ficam no código, não neste documento). A vantagem de quem pegou
vai até 20.

**1. Abertura** (termina pedindo o bicho)
1. Juro por tudo que fisguei
2. Ninguém vai acreditar, mas hoje quase trouxe
3. Pode perguntar pra qualquer um: eu fisguei
4. Hoje, sem exagero nenhum, veio no meu anzol
5. Vocês não vão acreditar: quase tirei da água
6. Lá embaixo, bem no fundo, eu fisguei
7. Foi rápido, mas deu tempo de ver que era
8. Tô tremendo até agora: fisguei
9. Palavra de pescador: hoje beliscou
10. Não é história, aconteceu: quase subi pro barco
11. Escuta essa: fisguei
12. Eu estava quase desistindo quando mordeu a isca
13. Quem me conhece sabe que eu não minto: fisguei
14. Hoje cedo, com essas mãos, segurei na linha
15. Contando ninguém acredita: veio no anzol

**2. Bicho** (termina em ponto)
1. um mero do tamanho de uma Kombi.
2. um peixe com dente de ouro.
3. uma lula que puxou o barco até o Uruguai.
4. um robalo tão grande que tapou o sol.
5. uma garoupa de óculos escuros.
6. um tubarão que sabia assobiar.
7. um peixe-espada de dois metros, e afiado.
8. um polvo que me deu três apertos de mão.
9. uma tainha tão pesada que o barco empinou.
10. uma arraia do tamanho de um tapete de sala.
11. um atum que corria mais que lancha.
12. uma baleia, ou pelo menos o filhote de uma.
13. um peixe dourado que brilhava no escuro.
14. um bagre com bigode de general.
15. um cação com mais dente que pente.

**3. Como escapou** (sem ele/ela)
1. A linha estourou bem na hora de subir no barco.
2. Me olhou, piscou e cuspiu o anzol.
3. Deu um tranco e levou a vara junto.
4. Quando fui pegar a rede, já tinha ido embora.
5. Pulou por cima do barco e voltou pro mar.
6. Escapou na última volta do molinete.
7. Foi meia hora de puxa e solta, e cansei antes.
8. Arrebentou a linha e ainda deu tchau com a nadadeira.
9. Comeu a isca inteira e devolveu o anzol limpinho.
10. Afundou tão rápido que o carretel soltou fumaça.
11. Enrolou a linha numa pedra e foi embora rindo.
12. Bateu o rabo, molhou todo mundo e sumiu.
13. Na hora da foto, se soltou.
14. Puxou tanto que o barco andou de ré.
15. Mergulhou e só deixou as bolhas.

**4. Desculpa**
1. O vizinho viu.
2. Foto? Acabou a bateria.
3. Amanhã eu pego.
4. Tenho testemunha.
5. Ainda estou com o braço doendo.
6. Pode perguntar pros peixes.
7. Era desse tamanho 👐
8. Juro que é verdade.
9. Quem não acredita que vá lá ver.
10. O barco está aí de prova, todo torto.
11. Minha mão ainda está cheirando a peixe.
12. Volto lá amanhã para buscar.
13. Se eu estiver mentindo, que me falte isca.
14. O resto eu não conto, porque ninguém ia acreditar.
15. E isso foi só o aquecimento.

**Vantagem de quem pegou** (`{cm}` = tamanho real; 10 opções, em cima da barra)
1. Peixão no barco: {cm} cm na régua, e olha que a régua encolheu.
2. {cm} cm de peixe. Medi duas vezes pra ter certeza.
3. Trouxe o peixão: {cm} cm. Na água parecia o dobro.
4. Peixão de {cm} cm no barco. Quem duvida, vem ver.
5. {cm} cm de peixão, e nem suei.
6. Subiu o peixão: {cm} cm. O barco quase virou.
7. Hoje teve peixão: {cm} cm certinhos.
8. Peixão de {cm} cm. Já tem nome e lugar na parede.
9. {cm} cm. Tirei foto, chamei a vizinha, liguei pra família.
10. Peixão de {cm} cm, e foi na primeira tentativa.

## Para quem for construir
- Os bancos e a função de sorteio ficam ao lado de `shareText`; `shareText` escolhe entre
  história e barra a partir de `st.end`.
- Os bancos em inglês são escritos na implementação e revisados à parte.
- Checagem: um script em Node que monta todas as 50.625 combinações (PT e EN) e falha com linha
  vazia, espaço duplo, pontuação dupla ou texto acima de ~280 caracteres.
