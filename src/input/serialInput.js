const DEFAULT_CHANNEL_MAP = {
  A: 'amber',
  B: 'woody',
  C: 'fresh',
  D: 'floral',
};

export async function connectSerialInput(
  sceneManager,
  {
    onStatus = () => {},
    channelMap = DEFAULT_CHANNEL_MAP,
  } = {},
) {
  if (!('serial' in navigator)) {
    throw new Error(
      '이 브라우저는 Web Serial API를 지원하지 않습니다.',
    );
  }

  /**
   * 사용자가 ESP32 COM 포트 선택
   */
  const port =
    await navigator.serial.requestPort();

  /**
   * ESP32 코드와 동일한 baud rate
   */
  await port.open({
    baudRate: 115200,
  });

  console.log(
    'ESP32 Serial 연결 완료',
  );

  onStatus(
    '센서 연결 완료',
  );

  /**
   * ESP32 → Browser 데이터 읽기
   */
  const reader =
    port.readable.getReader();

  const decoder =
    new TextDecoder();

  let buffer = '';

  async function readLoop() {
    try {
      while (true) {
        const {
          value,
          done,
        } = await reader.read();

        if (done) {
          break;
        }

        /**
         * Uint8Array → 문자열
         */
        buffer += decoder.decode(
          value,
          {
            stream: true,
          },
        );

        /**
         * ESP32가 println()으로 보내므로
         * 줄 단위로 처리.
         */
        let newlineIndex;

        while (
          (
            newlineIndex =
              buffer.indexOf('\n')
          ) !== -1
        ) {
          const line =
            buffer
              .slice(
                0,
                newlineIndex,
              )
              .trim();

          buffer =
            buffer.slice(
              newlineIndex + 1,
            );

          handleSerialLine(line);
        }
      }
    } catch (error) {
      console.error(
        'Serial 읽기 오류:',
        error,
      );

      onStatus(
        '센서 연결 오류',
      );
    } finally {
      reader.releaseLock();
    }
  }

  function handleSerialLine(line) {
    console.log(
      'ESP32 →',
      line,
    );

    /**
     * RELEASED는 애니메이션 실행할 필요 없음.
     *
     * "A PRESSED"
     * "B PRESSED"
     * ...
     * 만 처리.
     */
    const match =
      line.match(
        /^([A-D])\s+PRESSED$/,
      );

    if (!match) {
      return;
    }

    const channel =
      match[1];

    const sceneName =
      channelMap[channel];

    if (!sceneName) {
      console.warn(
        `등록되지 않은 센서 채널: ${channel}`,
      );

      return;
    }

    console.log(
      `${channel} → ${sceneName.toUpperCase()}`,
    );

    sceneManager.trigger(
      sceneName,
    );
  }

  /**
   * 읽기는 백그라운드에서 계속 진행.
   */
  readLoop();

  return port;
}